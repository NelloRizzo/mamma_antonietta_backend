import pool from './db.js';

const seed = async () => {
    console.log("Inizio popolamento database...");
    const client = await pool.connect();

    try {
        // 1. Pulizia e creazione tabelle
        await client.query(`
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;

      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        color VARCHAR(20) DEFAULT '#333333',
        image_url TEXT
      );

      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        items JSONB NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        priority_score INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 2. Inserimento dei prodotti
        const products = [
            ['Pizza Fritta', 6.00, '#FF6B6B', 'pizzafritta'],
            ['Pizza Fritta Gourmet', 7.50, '#FF8787', 'pizzagourmet'],
            ['Koulibaly', 3.50, '#FCC419', 'koulibaly'],
            ['Sgranocchiotti', 5.00, '#51CF66', 'sgranocchiotti'],
            ['Lemonsì', 3.00, '#339AF0', 'lemonsi'],
            ['Vino', 1.50, '#6b0579ff', 'vino']
        ];

        for (const p of products) {
            await client.query(
                'INSERT INTO products (name, price, color, image_url) VALUES ($1, $2, $3, $4)',
                p
            );
        }

        console.log("Database popolato con successo!");
    } catch (err) {
        console.error("Errore durante il seeding:", err);
    } finally {
        client.release();
        process.exit();
    }
};

seed();