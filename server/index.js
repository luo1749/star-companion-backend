const express = require('express');
const app = express();
const port = 3000;

app.get('/students', (req, res) => {
  res.json([
    { id: 1, name: '张三' },
    { id: 2, name: '李四' }
  ]);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});