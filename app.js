(function (global) {
  "use strict";

  const sampleText = "A:5, B:9, C:12, D:13, E:16, F:45";

  function createLeaf(label, weight, order) {
    return {
      id: `leaf-${order}`,
      label,
      weight,
      order,
      left: null,
      right: null,
    };
  }

  function parseInput(text) {
    const raw = text
      .split(/[\n,，]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (raw.length < 2) {
      throw new Error("至少需要输入两个字符权值项。");
    }

    const seen = new Set();
    return raw.map((item, index) => {
      const match = item.match(/^(.+?)\s*[:：]\s*(\d+)$/);
      if (!match) {
        throw new Error(`无法识别“${item}”，请使用“字符:正整数”的格式。`);
      }

      const label = match[1].trim();
      const weight = Number(match[2]);

      if (!label) {
        throw new Error("字符名不能为空。");
      }
      if (seen.has(label)) {
        throw new Error(`字符“${label}”重复，请保证每个字符只出现一次。`);
      }
      if (!Number.isSafeInteger(weight) || weight <= 0) {
        throw new Error(`字符“${label}”的权值必须是正整数。`);
      }

      seen.add(label);
      return createLeaf(label, weight, index);
    });
  }

  function cloneNode(node) {
    if (!node) {
      return null;
    }

    return {
      id: node.id,
      label: node.label,
      weight: node.weight,
      order: node.order,
      left: cloneNode(node.left),
      right: cloneNode(node.right),
    };
  }

  function cloneQueue(queue) {
    return queue.map(cloneNode);
  }

  function sortQueue(queue) {
    queue.sort((a, b) => {
      if (a.weight !== b.weight) {
        return a.weight - b.weight;
      }
      return a.order - b.order;
    });
  }

  function displayLabel(node) {
    return node.label || `N${node.order}`;
  }

  function buildSteps(leaves) {
    const queue = leaves.map(cloneNode);
    sortQueue(queue);

    const steps = [
      {
        type: "init",
        queue: cloneQueue(queue),
        root: queue.length === 1 ? cloneNode(queue[0]) : null,
        pickedIds: [],
        mergedId: null,
        message: "初始化：将所有叶子节点按权值升序放入优先队列。",
      },
    ];

    let nextOrder = leaves.length;
    while (queue.length > 1) {
      sortQueue(queue);
      const first = queue.shift();
      const second = queue.shift();

      steps.push({
        type: "pick",
        queue: cloneQueue([first, second, ...queue]),
        root: queue.length === 0 ? null : cloneNode(queue[0]),
        pickedIds: [first.id, second.id],
        mergedId: null,
        message: `取出两个最小节点：${displayLabel(first)}(${first.weight}) 和 ${displayLabel(second)}(${second.weight})。`,
      });

      const merged = {
        id: `node-${nextOrder}`,
        label: "",
        weight: first.weight + second.weight,
        order: nextOrder,
        left: first,
        right: second,
      };
      nextOrder += 1;

      queue.push(merged);
      sortQueue(queue);

      steps.push({
        type: "merge",
        queue: cloneQueue(queue),
        root: cloneNode(merged),
        pickedIds: [first.id, second.id],
        mergedId: merged.id,
        message: `合并得到新节点 N${merged.order}，权值为 ${merged.weight}，再放回优先队列。`,
      });
    }

    const root = queue[0];
    steps.push({
      type: "finish",
      queue: cloneQueue(queue),
      root: cloneNode(root),
      pickedIds: [],
      mergedId: root.id,
      message: "队列中只剩一个节点，哈夫曼树构建完成。",
    });

    return steps;
  }

  function generateCodes(root) {
    const codes = [];

    function walk(node, path) {
      if (!node) {
        return;
      }

      if (!node.left && !node.right) {
        codes.push({
          label: node.label,
          weight: node.weight,
          code: path || "0",
        });
        return;
      }

      walk(node.left, `${path}0`);
      walk(node.right, `${path}1`);
    }

    walk(root, "");
    return codes.sort((a, b) => a.label.localeCompare(b.label, "zh-Hans-CN"));
  }

  function collectNodes(root) {
    const nodes = [];
    const edges = [];
    const leaves = [];
    let cursor = 0;

    function traverse(node, depth, parent, bit) {
      if (!node) {
        return 0;
      }

      const isLeaf = !node.left && !node.right;
      let x;
      if (isLeaf) {
        x = cursor;
        cursor += 1;
        leaves.push(node);
      } else {
        const leftX = traverse(node.left, depth + 1, node, "0");
        const rightX = traverse(node.right, depth + 1, node, "1");
        x = (leftX + rightX) / 2;
      }

      nodes.push({ node, x, depth, isLeaf });
      if (parent) {
        edges.push({ from: parent.id, to: node.id, bit });
      }
      return x;
    }

    traverse(root, 0, null, "");
    return { nodes, edges, leafCount: Math.max(leaves.length, 1) };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function initDom() {
    const el = {
      dataInput: document.getElementById("dataInput"),
      errorMessage: document.getElementById("errorMessage"),
      sampleBtn: document.getElementById("sampleBtn"),
      initBtn: document.getElementById("initBtn"),
      nextBtn: document.getElementById("nextBtn"),
      resetBtn: document.getElementById("resetBtn"),
      phaseText: document.getElementById("phaseText"),
      stepIndex: document.getElementById("stepIndex"),
      stepTotal: document.getElementById("stepTotal"),
      queueList: document.getElementById("queueList"),
      treeSvg: document.getElementById("treeSvg"),
      currentAction: document.getElementById("currentAction"),
      stepLog: document.getElementById("stepLog"),
      codesBody: document.getElementById("codesBody"),
    };

    const state = {
      leaves: [],
      steps: [],
      current: -1,
    };

    function setError(message) {
      el.errorMessage.textContent = message || "";
    }

    function updateStatus(step) {
      const labels = {
        init: "初始化",
        pick: "取最小节点",
        merge: "合并并入队",
        finish: "完成",
      };
      el.phaseText.textContent = step ? labels[step.type] : "等待初始化";
      el.stepIndex.textContent = state.current < 0 ? "0" : String(state.current + 1);
      el.stepTotal.textContent = String(state.steps.length);
      el.currentAction.textContent = step ? step.message : "点击“初始化”开始演示";
      el.nextBtn.disabled = state.current < 0 || state.current >= state.steps.length - 1;
    }

    function renderQueue(step) {
      const picked = new Set(step ? step.pickedIds : []);
      const merged = step ? step.mergedId : null;

      if (!step || step.queue.length === 0) {
        el.queueList.innerHTML = "<span class=\"hint\">暂无队列数据</span>";
        return;
      }

      el.queueList.innerHTML = step.queue
        .map((node) => {
          const classes = ["queue-item"];
          if (picked.has(node.id)) {
            classes.push("picked");
          }
          if (merged === node.id) {
            classes.push("merged");
          }

          return `<div class="${classes.join(" ")}">
            <span class="queue-label">${escapeHtml(displayLabel(node))}</span>
            <span class="queue-weight">w=${node.weight}</span>
          </div>`;
        })
        .join("");
    }

    function renderStepLog() {
      if (state.steps.length === 0) {
        el.stepLog.innerHTML = "<li>等待输入数据并初始化。</li>";
        return;
      }

      el.stepLog.innerHTML = state.steps
        .map((step, index) => {
          const active = index === state.current ? " class=\"active\"" : "";
          return `<li${active}>${escapeHtml(step.message)}</li>`;
        })
        .join("");
    }

    function renderCodes(root, finished) {
      if (!finished || !root) {
        el.codesBody.innerHTML = "<tr><td colspan=\"3\">构建完成后显示编码</td></tr>";
        return;
      }

      el.codesBody.innerHTML = generateCodes(root)
        .map((item) => `<tr>
          <td>${escapeHtml(item.label)}</td>
          <td>${item.weight}</td>
          <td><strong>${item.code}</strong></td>
        </tr>`)
        .join("");
    }

    function renderTree(step) {
      const svg = el.treeSvg;
      svg.innerHTML = "";

      if (!step || !step.root) {
        svg.setAttribute("viewBox", "0 0 720 560");
        svg.innerHTML = "<text x=\"360\" y=\"280\" text-anchor=\"middle\" fill=\"#5c667a\" font-size=\"18\" font-weight=\"700\">初始化后显示树形结构</text>";
        return;
      }

      const picked = new Set(step.pickedIds);
      const merged = step.mergedId;
      const layout = collectNodes(step.root);
      const xGap = 94;
      const yGap = 94;
      const marginX = 70;
      const marginY = 58;
      const maxDepth = layout.nodes.reduce((max, item) => Math.max(max, item.depth), 0);
      const width = Math.max(720, marginX * 2 + (layout.leafCount - 1) * xGap);
      const height = Math.max(560, marginY * 2 + maxDepth * yGap + 80);
      const positions = new Map();

      layout.nodes.forEach((item) => {
        positions.set(item.node.id, {
          x: marginX + item.x * xGap,
          y: marginY + item.depth * yGap,
          item,
        });
      });

      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

      const edgeMarkup = layout.edges
        .map((edge) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          const labelX = (from.x + to.x) / 2;
          const labelY = (from.y + to.y) / 2 - 8;
          return `<line class="tree-edge" x1="${from.x}" y1="${from.y + 26}" x2="${to.x}" y2="${to.y - 28}"></line>
            <text class="edge-label" x="${labelX}" y="${labelY}" text-anchor="middle">${edge.bit}</text>`;
        })
        .join("");

      const nodeMarkup = layout.nodes
        .map(({ node, isLeaf }) => {
          const position = positions.get(node.id);
          const classes = ["tree-node"];
          if (isLeaf) {
            classes.push("leaf");
          }
          if (picked.has(node.id)) {
            classes.push("picked");
          }
          if (merged === node.id) {
            classes.push("merged");
          }
          return `<g class="${classes.join(" ")}" transform="translate(${position.x}, ${position.y})">
            <circle r="28"></circle>
            <text class="node-label" y="-4">${escapeHtml(displayLabel(node))}</text>
            <text class="node-weight" y="15">${node.weight}</text>
          </g>`;
        })
        .join("");

      svg.innerHTML = `${edgeMarkup}${nodeMarkup}`;
    }

    function render() {
      const step = state.steps[state.current] || null;
      updateStatus(step);
      renderQueue(step);
      renderStepLog();
      renderTree(step);
      renderCodes(step ? step.root : null, step && step.type === "finish");
    }

    function initialize() {
      try {
        setError("");
        state.leaves = parseInput(el.dataInput.value);
        state.steps = buildSteps(state.leaves);
        state.current = 0;
        render();
      } catch (error) {
        state.steps = [];
        state.current = -1;
        setError(error.message);
        render();
      }
    }

    function reset() {
      setError("");
      state.leaves = [];
      state.steps = [];
      state.current = -1;
      render();
    }

    el.sampleBtn.addEventListener("click", () => {
      el.dataInput.value = sampleText;
      initialize();
    });
    el.initBtn.addEventListener("click", initialize);
    el.nextBtn.addEventListener("click", () => {
      if (state.current < state.steps.length - 1) {
        state.current += 1;
        render();
      }
    });
    el.resetBtn.addEventListener("click", reset);

    render();
  }

  const api = {
    parseInput,
    buildSteps,
    generateCodes,
    displayLabel,
    initDom,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (global.document) {
    global.addEventListener("DOMContentLoaded", initDom);
  }

  global.HuffmanDemo = api;
})(typeof window !== "undefined" ? window : globalThis);
