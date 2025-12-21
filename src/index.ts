import express, { type Request, type Response, type Application } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import pool from './db.js';
import { type Order, type Product } from './types.js';

const app: Application = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

app.use(cors());
app.use(express.json());

// --- API ROUTES ---
app.get('/api/test', (req: Request, res: Response) => {
    res.json({ message: "Il server risponde correttamente!" });
});

// Ottieni prodotti
app.get('/api/products', async (_req: Request, res: Response) => {
    try {
        const { rows } = await pool.query<Product>('SELECT * FROM products ORDER BY id');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Errore nel recupero prodotti', internalError: err });
    }
});

// Ottieni ordini attivi (ordinati per priorità e tempo)
app.get('/api/orders', async (_req: Request, res: Response) => {
    try {
        const query = `
      SELECT * FROM orders 
      WHERE status = 'pending' 
      ORDER BY priority_score DESC, created_at ASC
    `;
        const { rows } = await pool.query<Order>(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Errore nel recupero ordini' });
    }
});

// Crea ordine
app.post('/api/orders', async (req: Request, res: Response) => {
    const { items, total_price } = req.body;
    try {
        const query = `
      INSERT INTO orders (items, total_price, priority_score) 
      VALUES ($1, $2, 0) RETURNING *
    `;
        const { rows } = await pool.query<Order>(query, [JSON.stringify(items), total_price]);
        const newOrder = rows[0];

        // Notifica la cucina via Socket
        io.emit('order:new', newOrder);

        res.status(201).json(newOrder);
    } catch (err) {
        res.status(500).json({ error: 'Errore creazione ordine' });
    }
});

// Aggiorna stato (es. da pending a completed)
app.put('/api/orders/:id/status', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const { rows } = await pool.query<Order>(
            'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (rows.length > 0) {
            io.emit('order:updated', rows[0]);
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Ordine non trovato' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Errore aggiornamento ordine' });
    }
});

// Modifica Priorità
app.put('/api/orders/:id/priority', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { score } = req.body;
    try {
        const { rows } = await pool.query<Order>(
            'UPDATE orders SET priority_score = $1 WHERE id = $2 RETURNING *',
            [score, id]
        );
        io.emit('order:priority_changed', rows[0]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Errore priorità' });
    }
});

app.delete('/api/orders/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Eliminiamo l'ordine dal database
        const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING id', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Ordine non trovato" });
        }

        // Notifichiamo via WebSocket che l'ordine è stato rimosso
        io.emit('order:deleted', { id: parseInt(id!) });

        res.status(200).json({ message: "Ordine eliminato con successo" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore durante l'eliminazione" });
    }
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    console.log(`Client connesso: ${socket.id}`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server TS in esecuzione sulla porta ${PORT}`);
});