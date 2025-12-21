export interface Product {
  id: number;
  name: string;
  price: number;
  color: string;
  ingredients: string;
}

export interface Order {
  id: number;
  items: { id: number; name: string; price: number }[];
  total_price: number;
  status: 'pending' | 'completed';
  priority_score: number;
  created_at: Date;
}