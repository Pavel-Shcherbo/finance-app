const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json()); // bodyParser.json()

// Логирование всех запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Временное хранение данных в памяти
let activities = [];

// Получить все занятия
app.get('/api/activities', (req, res) => {
  res.json(activities);
});

// Добавить новое занятие
app.post('/api/activities', (req, res) => {
  const { name, day, time, duration } = req.body;

  // Проверка пересечений по дню и времени
  const conflict = activities.find(a => a.day === day && a.time === time);
  if (conflict) {
    return res.status(400).json({ message: 'Занятие пересекается с существующим.' });
  }

  const newActivity = {
    _id: Date.now().toString(),
    name,
    day,
    time,
    duration
  };
  activities.push(newActivity);
  res.status(201).json(newActivity);
});

// Удалить занятие по id
app.delete('/api/activities/:id', (req, res) => {
  const id = req.params.id;
  const index = activities.findIndex(a => a._id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'Занятие не найдено' });
  }
  activities.splice(index,1);
  res.json({ message: 'Занятие удалено' });
});

// Обработка всех остальных запросов — отдача index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Сервер запущен на http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Process ID: ${process.pid}`);
  console.log('Сервер готов принимать соединения...');
});