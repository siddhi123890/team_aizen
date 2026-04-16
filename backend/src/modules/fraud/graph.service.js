const logger = require('../../utils/logger');

/**
 * Graph Detection Service
 * Maintains an in-memory transaction graph to detect network-based fraud patterns
 * Nodes = users, Edges = transactions between users
 */
class GraphService {
  constructor() {
    // Adjacency list: userId -> Map<receiverId, { count, totalAmount, timestamps[] }>
    this.graph = new Map();

    // Reverse adjacency for incoming edges
    this.reverseGraph = new Map();

    // Configuration
    this.DEGREE_SPIKE_THRESHOLD = 10;   // Max unique receivers in short period
    this.CIRCULAR_PATH_MAX_DEPTH = 4;   // Max depth for cycle detection
    this.FAN_OUT_THRESHOLD = 5;         // One-to-many threshold
    this.CLEANUP_INTERVAL = 30 * 60 * 1000; // Clean old edges every 30 min
    this.EDGE_TTL = 60 * 60 * 1000;     // Edges older than 1 hour are stale

    // Periodic cleanup
    setInterval(() => this._cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Add a transaction edge to the graph
   */
  addEdge(userId, receiverId, amount) {
    if (!userId || !receiverId) return;

    // Forward edge
    if (!this.graph.has(userId)) {
      this.graph.set(userId, new Map());
    }
    const edges = this.graph.get(userId);
    if (!edges.has(receiverId)) {
      edges.set(receiverId, { count: 0, totalAmount: 0, timestamps: [] });
    }
    const edge = edges.get(receiverId);
    edge.count++;
    edge.totalAmount += amount;
    edge.timestamps.push(Date.now());

    // Reverse edge
    if (!this.reverseGraph.has(receiverId)) {
      this.reverseGraph.set(receiverId, new Set());
    }
    this.reverseGraph.get(receiverId).add(userId);
  }

  /**
   * Analyze graph patterns for a transaction
   * @param {Object} transaction
   * @returns {Object} { score: 0-1, reasons: string[] }
   */
  analyze(transaction) {
    try {
      const { userId, receiverId, amount } = transaction;
      const reasons = [];
      let totalScore = 0;
      let factorCount = 0;

      // Add this edge to the graph
      if (receiverId) {
        this.addEdge(userId, receiverId, amount);
      }

      // 1. Degree spike detection (fan-out)
      const fanOutScore = this._checkFanOut(userId);
      if (fanOutScore > 0) {
        reasons.push(`High fan-out: sending to many recipients`);
      }
      totalScore += fanOutScore;
      factorCount++;

      // 2. Circular path detection
      if (receiverId) {
        const circularScore = this._checkCircularPath(userId, receiverId);
        if (circularScore > 0) {
          reasons.push(`Circular transaction path detected`);
        }
        totalScore += circularScore;
        factorCount++;
      }

      // 3. One-to-many burst detection
      const burstScore = this._checkBurst(userId);
      if (burstScore > 0) {
        reasons.push(`Rapid one-to-many transfers detected`);
      }
      totalScore += burstScore;
      factorCount++;

      // 4. Incoming fan-in (multiple senders to same receiver)
      if (receiverId) {
        const fanInScore = this._checkFanIn(receiverId);
        if (fanInScore > 0) {
          reasons.push(`Receiver has high incoming transfer volume`);
        }
        totalScore += fanInScore;
        factorCount++;
      }

      const finalScore = Math.min(factorCount > 0 ? totalScore / factorCount : 0, 1);

      logger.debug(`Graph analysis for user ${userId}: score=${finalScore.toFixed(3)}`, {
        fanOutScore,
        burstScore,
        graphSize: this.graph.size,
      });

      return {
        score: finalScore,
        reasons,
      };
    } catch (error) {
      logger.error(`Graph analysis error: ${error.message}`);
      return { score: 0, reasons: [] };
    }
  }

  /**
   * Check fan-out: how many unique receivers does this user have?
   */
  _checkFanOut(userId) {
    const edges = this.graph.get(userId);
    if (!edges) return 0;

    const uniqueReceivers = edges.size;
    if (uniqueReceivers >= this.FAN_OUT_THRESHOLD) {
      return Math.min(0.4 + (uniqueReceivers - this.FAN_OUT_THRESHOLD) * 0.1, 1);
    }
    return 0;
  }

  /**
   * Check for circular paths (money laundering indicator)
   * Uses BFS from receiver to see if we can reach back to sender
   */
  _checkCircularPath(senderId, receiverId) {
    const visited = new Set();
    const queue = [{ node: receiverId, depth: 0 }];

    while (queue.length > 0) {
      const { node, depth } = queue.shift();

      if (depth > this.CIRCULAR_PATH_MAX_DEPTH) continue;
      if (node === senderId && depth > 0) {
        // Found a cycle!
        return Math.min(0.7 + (1 / (depth + 1)) * 0.3, 1);
      }

      if (visited.has(node)) continue;
      visited.add(node);

      const edges = this.graph.get(node);
      if (edges) {
        for (const [neighbor] of edges) {
          if (!visited.has(neighbor)) {
            queue.push({ node: neighbor, depth: depth + 1 });
          }
        }
      }
    }

    return 0;
  }

  /**
   * Check for burst: rapid transactions from one user in last minute
   */
  _checkBurst(userId) {
    const edges = this.graph.get(userId);
    if (!edges) return 0;

    const oneMinuteAgo = Date.now() - 60 * 1000;
    let recentCount = 0;

    for (const [, edge] of edges) {
      recentCount += edge.timestamps.filter((t) => t > oneMinuteAgo).length;
    }

    if (recentCount >= this.DEGREE_SPIKE_THRESHOLD) {
      return Math.min(0.5 + (recentCount - this.DEGREE_SPIKE_THRESHOLD) * 0.05, 1);
    }

    return 0;
  }

  /**
   * Check fan-in: many senders to the same receiver
   */
  _checkFanIn(receiverId) {
    const senders = this.reverseGraph.get(receiverId);
    if (!senders) return 0;

    if (senders.size >= this.FAN_OUT_THRESHOLD) {
      return Math.min(0.3 + (senders.size - this.FAN_OUT_THRESHOLD) * 0.1, 1);
    }

    return 0;
  }

  /**
   * Clean up stale edges to prevent memory leaks
   */
  _cleanup() {
    const cutoff = Date.now() - this.EDGE_TTL;
    let cleaned = 0;

    for (const [userId, edges] of this.graph) {
      for (const [receiverId, edge] of edges) {
        edge.timestamps = edge.timestamps.filter((t) => t > cutoff);
        if (edge.timestamps.length === 0) {
          edges.delete(receiverId);
          cleaned++;
        }
      }
      if (edges.size === 0) {
        this.graph.delete(userId);
      }
    }

    if (cleaned > 0) {
      logger.info(`Graph cleanup: removed ${cleaned} stale edges`);
    }
  }

  /**
   * Get graph statistics (for monitoring/debugging)
   */
  getStats() {
    let totalEdges = 0;
    for (const [, edges] of this.graph) {
      totalEdges += edges.size;
    }

    return {
      totalNodes: this.graph.size,
      totalEdges,
      reverseNodes: this.reverseGraph.size,
    };
  }
}

module.exports = new GraphService();
