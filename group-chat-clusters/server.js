const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Helper: Union-Find (Disjoint Set Union) for O(m * α(n)) complexity
class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n + 1 }, (_, i) => i);
    this.rank = Array(n + 1).fill(0);
    this.size = Array(n + 1).fill(1);
    this.components = n;
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }

  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return false;

    // Union by rank
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
      this.size[rootY] += this.size[rootX];
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
      this.size[rootX] += this.size[rootY];
    } else {
      this.parent[rootY] = rootX;
      this.size[rootX] += this.size[rootY];
      this.rank[rootX]++;
    }

    this.components--;
    return true;
  }

  getComponentSize(x) {
    return this.size[this.find(x)];
  }

  getComponents() {
    return this.components;
  }
}

// BFS implementation with detailed component info
function bfsAnalysis(n, edges) {
  const graph = {};
  for (let i = 1; i <= n; i++) graph[i] = [];
  
  edges.forEach(([u, v]) => {
    if (u >= 1 && u <= n && v >= 1 && v <= n) {
      graph[u].push(v);
      graph[v].push(u);
    }
  });

  const visited = Array(n + 1).fill(false);
  let components = 0;
  const nodeToGroup = {};
  const componentInfo = [];

  function bfs(start, group) {
    const queue = [start];
    const nodesInComponent = [];
    let edgesInComponent = 0;
    
    visited[start] = true;
    nodeToGroup[start] = group;

    while (queue.length) {
      const node = queue.shift();
      nodesInComponent.push(node);
      edgesInComponent += graph[node].length;

      for (const neighbor of graph[node]) {
        if (!visited[neighbor]) {
          visited[neighbor] = true;
          nodeToGroup[neighbor] = group;
          queue.push(neighbor);
        }
      }
    }

    return {
      nodes: nodesInComponent,
      size: nodesInComponent.length,
      edges: edgesInComponent / 2, // Each edge counted twice
      density: nodesInComponent.length > 1 
        ? (edgesInComponent / (nodesInComponent.length * (nodesInComponent.length - 1))) 
        : 0
    };
  }

  for (let i = 1; i <= n; i++) {
    if (!visited[i]) {
      components++;
      const compInfo = bfs(i, components);
      componentInfo.push(compInfo);
    }
  }

  return { components, nodeToGroup, componentInfo, graph };
}

// DFS implementation
function dfsAnalysis(n, edges) {
  const graph = {};
  for (let i = 1; i <= n; i++) graph[i] = [];
  
  edges.forEach(([u, v]) => {
    if (u >= 1 && u <= n && v >= 1 && v <= n) {
      graph[u].push(v);
      graph[v].push(u);
    }
  });

  const visited = Array(n + 1).fill(false);
  let components = 0;
  const nodeToGroup = {};
  const componentInfo = [];

  function dfs(node, group, nodesInComponent) {
    visited[node] = true;
    nodeToGroup[node] = group;
    nodesInComponent.push(node);

    for (const neighbor of graph[node]) {
      if (!visited[neighbor]) {
        dfs(neighbor, group, nodesInComponent);
      }
    }
  }

  for (let i = 1; i <= n; i++) {
    if (!visited[i]) {
      components++;
      const nodesInComponent = [];
      dfs(i, components, nodesInComponent);
      
      let edgesInComponent = 0;
      nodesInComponent.forEach(node => {
        edgesInComponent += graph[node].length;
      });

      componentInfo.push({
        nodes: nodesInComponent,
        size: nodesInComponent.length,
        edges: edgesInComponent / 2,
        density: nodesInComponent.length > 1 
          ? (edgesInComponent / (nodesInComponent.length * (nodesInComponent.length - 1))) 
          : 0
      });
    }
  }

  return { components, nodeToGroup, componentInfo, graph };
}

// Main analysis endpoint with multiple algorithms
app.post('/analyze', (req, res) => {
  try {
    const { n, edges, algorithm = 'bfs' } = req.body;

    // Input validation
    if (!n || n < 1 || n > 100000) {
      return res.status(400).json({ error: 'Invalid n: must be between 1 and 100,000' });
    }

    if (!Array.isArray(edges)) {
      return res.status(400).json({ error: 'Edges must be an array' });
    }

    if (edges.length > 200000) {
      return res.status(400).json({ error: 'Too many edges: maximum 200,000' });
    }

    const startTime = Date.now();
    let result;

    switch (algorithm) {
      case 'dfs':
        result = dfsAnalysis(n, edges);
        break;
      case 'union-find':
        const uf = new UnionFind(n);
        edges.forEach(([u, v]) => {
          if (u >= 1 && u <= n && v >= 1 && v <= n) {
            uf.union(u, v);
          }
        });
        
        // Build component info for union-find
        const componentMap = {};
        for (let i = 1; i <= n; i++) {
          const root = uf.find(i);
          if (!componentMap[root]) {
            componentMap[root] = [];
          }
          componentMap[root].push(i);
        }
        
        const componentInfo = Object.values(componentMap).map(nodes => ({
          nodes,
          size: nodes.length,
          edges: 0, // Would need graph to calculate
          density: 0
        }));

        result = {
          components: uf.getComponents(),
          nodeToGroup: {},
          componentInfo,
          graph: {}
        };
        break;
      default:
        result = bfsAnalysis(n, edges);
    }

    const executionTime = Date.now() - startTime;

    // Build response
    const nodes = Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      group: result.nodeToGroup[i + 1] || result.components + 1,
      degree: result.graph[i + 1] ? result.graph[i + 1].length : 0
    }));

    const links = edges
      .filter(([u, v]) => u >= 1 && u <= n && v >= 1 && v <= n)
      .map(([u, v]) => ({ source: u, target: v }));

    // Calculate statistics
    const componentSizes = result.componentInfo.map(c => c.size);
    const isolatedNodes = componentSizes.filter(size => size === 1).length;
    const largestComponent = Math.max(...componentSizes);
    const avgComponentSize = componentSizes.reduce((a, b) => a + b, 0) / result.components;

    res.json({
      components: result.components,
      nodes,
      links,
      componentInfo: result.componentInfo,
      statistics: {
        isolatedNodes,
        largestComponent,
        smallestComponent: Math.min(...componentSizes),
        avgComponentSize: parseFloat(avgComponentSize.toFixed(2)),
        totalEdges: links.length,
        density: n > 1 ? (links.length / (n * (n - 1) / 2)) : 0,
        executionTime: `${executionTime}ms`,
        algorithm
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Algorithm comparison endpoint
app.post('/compare', (req, res) => {
  try {
    const { n, edges } = req.body;

    const algorithms = ['bfs', 'dfs', 'union-find'];
    const results = {};

    algorithms.forEach(algo => {
      const startTime = Date.now();
      
      if (algo === 'union-find') {
        const uf = new UnionFind(n);
        edges.forEach(([u, v]) => {
          if (u >= 1 && u <= n && v >= 1 && v <= n) {
            uf.union(u, v);
          }
        });
        results[algo] = {
          components: uf.getComponents(),
          time: Date.now() - startTime
        };
      } else {
        const analysisFn = algo === 'bfs' ? bfsAnalysis : dfsAnalysis;
        const result = analysisFn(n, edges);
        results[algo] = {
          components: result.components,
          time: Date.now() - startTime
        };
      }
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Endpoints available:`);
  console.log(`   POST /analyze - Analyze graph components`);
  console.log(`   POST /compare - Compare algorithm performance`);
  console.log(`   GET  /health  - Health check`);
});