const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // serve frontend

// ---------- BFS/DFS Logic ----------
app.post('/analyze', (req, res) => {
  const { n, edges } = req.body;

  // Build adjacency list
  const graph = {};
  for (let i = 1; i <= n; i++) graph[i] = [];
  edges.forEach(([u, v]) => {
    graph[u].push(v);
    graph[v].push(u);
  });

  // BFS
  const visited = Array(n + 1).fill(false);
  let components = 0;
  const nodeToGroup = {};

  function bfs(start, group) {
    const queue = [start];
    visited[start] = true;
    nodeToGroup[start] = group;

    while (queue.length) {
      const node = queue.shift();
      for (const neighbor of graph[node]) {
        if (!visited[neighbor]) {
          visited[neighbor] = true;
          nodeToGroup[neighbor] = group;
          queue.push(neighbor);
        }
      }
    }
  }

  for (let i = 1; i <= n; i++) {
    if (!visited[i]) {
      components++;
      bfs(i, components);
    }
  }

  const nodes = Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    group: nodeToGroup[i + 1] || components + 1,
  }));

  const links = edges.map(([u, v]) => ({ source: u, target: v }));

  res.json({ components, nodes, links });
});

// ---------- Start Server ----------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
