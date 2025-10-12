import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function GET() {
  const [rows] = await pool.query('SELECT * FROM users');
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const [result] = await pool.query('INSERT INTO users (name, email) VALUES (?, ?)', [body.name, body.email]);
  return NextResponse.json({ insertedId: (result as any).insertId });
}