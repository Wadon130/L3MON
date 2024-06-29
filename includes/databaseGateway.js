// Включение express как обычно
const express = require('express');

// Использование динамического импорта для lowdb
async function initializeDatabase() {
  const { Low, JSONFile } = await import('lowdb');
  
  const adapter = new JSONFile('db.json');
  const db = new Low(adapter);
  
  await db.read();
  db.data ||= { posts: [] };
  
  return db;
}

// Экспорт функции для использования в других частях вашего приложения
module.exports = initializeDatabase;

