import React, { useState, useEffect } from 'react';

// --- 模拟数据 (更新预览) ---
const mockDatasets = [
  { id: 'ds1', name: '数据集 A', description: '用于二元分类的简单数据集。', preview: { type: '统计', info: '样本数: 100, 特征数: 4, 类别: 2' } },
  { id: 'ds2', name: '数据集 B', description: '包含更多特征的复杂数据集。', preview: { type: '样本', info: '[ [0.1, 0.2], [0.9, 0.8], ... ]' } },
   { id: 'ds3', name: '数据集 C (图像)', description: 'MNIST 手写数字子集。', preview: { type: '图像', info: '尺寸: 8x8, 类别: 2 (0 vs 1)' } },
];

const mockAnsatze = [
   { id: 'an1', name: 'Ansatz 1 (硬件高效型)', description: '一种常用的变分线路结构。', circuit: { num_qubits: 3, gates: [
       { gate: 'H', wires: [0], params: [] },
       { gate: 'H', wires: [1], params: [] },
       { gate: 'H', wires: [2], params: [] },
       { gate: 'CX', wires: [0, 1], params: [] },
       { gate: 'RY', wires: [0], params: ['θ1'] },
       { gate: 'CX', wires: [1, 2], params: [] },
       { gate: 'RY', wires: [1], params: ['θ2'] },
       { gate: 'RZ', wires: [2], params: ['θ3'] },
       { gate: 'CX', wires: [0, 1], params: [] },
       { gate: 'CX', wires: [1, 2], params: [] },
    ], details: '深度: 6, 参数: 3' } }, // 深度是估算的
   { id: 'an2', name: 'Ansatz 2 (问题启发型)', description: '针对特定问题设计的线路。', circuit: { num_qubits: 2, gates: [
       { gate: 'RY', wires: [0], params: ['θ1'] },
       { gate: 'RY', wires: [1], params: ['θ2'] },
       { gate: 'CZ', wires: [0, 1], params: [] },
       { gate: 'RX', wires: [0], params: ['θ3'] },
       { gate: 'RX', wires: [1], params: ['θ4'] },
    ], details: '深度: 3, 参数: 4' } },
];

const mockEncodings = [
   { id: 'en1', name: '基线编码 1 (角度编码)', description: '将数据编码为旋转门的角度。', circuit: { num_qubits: 2, gates: [
       { gate: 'RX', wires: [0], params: ['x1'] },
       { gate: 'RX', wires: [1], params: ['x2'] }
    ], details: '深度: 1' } },
   { id: 'en2', name: '基线编码 2 (稠密编码)', description: '更复杂的特征映射。', circuit: { num_qubits: 3, gates: [
       { gate: 'H', wires: [0], params: [] },
       { gate: 'H', wires: [1], params: [] },
       { gate: 'H', wires: [2], params: [] },
       { gate: 'RZ', wires: [0], params: ['x1'] },
       { gate: 'RZ', wires: [1], params: ['x2'] },
       { gate: 'RZ', wires: [2], params: ['x3'] },
       { gate: 'CX', wires: [0, 1], params: [] },
       { gate: 'CX', wires: [1, 2], params: [] },
       { gate: 'RZ', wires: [0], params: ['x4'] },
       { gate: 'RZ', wires: [1], params: ['x5'] },
       { gate: 'RZ', wires: [2], params: ['x6'] },
    ], details: '深度: 5' } },
];
// --- 模拟数据结束 ---


// --- 组件定义 ---

/**
 * 增强版 SVG 量子线路图组件
 * @param {object} circuitData - 包含线路信息的对象 (num_qubits, gates)
 */
function CircuitDiagram({ circuitData }) {
  if (!circuitData || !circuitData.gates || !circuitData.num_qubits) {
    return <div className="mt-2 text-center text-gray-400 text-xs">[无有效线路数据]</div>;
  }

  const numQubits = circuitData.num_qubits;
  const gates = circuitData.gates;

  // --- 布局和样式常量 ---
  const wireSpacing = 50; // 量子比特线间距增大
  const gateSize = 32;    // 门的基本尺寸 (正方形)
  const layerWidth = 50;  // 每层的宽度
  const padding = 25;     // SVG 内边距
  const textOffsetY = 4;  // 门内文字垂直偏移
  const paramOffsetY = 10; // 参数文字在门下方的偏移
  const controlRadius = 4; // 控制点半径
  const targetRadius = 8; // CNOT 目标圆半径
  const lineStrokeWidth = 1.5;
  const gateStrokeWidth = 1;

  // --- 门颜色定义 (示例) ---
  const gateColors = {
    H: '#a6d8f0', // Light Blue
    X: '#f0a6a6', // Light Red (Pauli-X)
    Y: '#f0a6a6', // Light Red (Pauli-Y)
    Z: '#f0a6a6', // Light Red (Pauli-Z)
    RX: '#a6f0c3', // Light Green (Rotations)
    RY: '#a6f0c3', // Light Green
    RZ: '#a6f0c3', // Light Green
    CX: '#cccccc', // Gray (Control)
    CZ: '#cccccc', // Gray (Control)
    SWAP: '#f0d8a6', // Light Orange
    DEFAULT: '#e0e0e0', // Default Gray
  };

  // --- 布局计算 ---
  // 计算每个门所在的层级 (Layer)
  const wireLayers = Array(numQubits).fill(0); // 记录每个量子比特进行到的层数
  const gateLayer = gates.map(gate => {
    let maxLayer = 0;
    // Ensure gate.wires is an array before iterating
    if (!Array.isArray(gate.wires)) {
        console.warn(`Gate has invalid wires property: ${JSON.stringify(gate)}`);
        return 0; // Assign to layer 0 or handle as error
    }
    gate.wires.forEach(wireIndex => {
      // Ensure wireIndex is a valid number and within bounds
      if (typeof wireIndex === 'number' && wireIndex >= 0 && wireIndex < numQubits) {
        maxLayer = Math.max(maxLayer, wireLayers[wireIndex]);
      } else {
        console.warn(`Gate references invalid wire index: ${wireIndex}`, gate);
      }
    });
    gate.wires.forEach(wireIndex => {
       // Ensure wireIndex is valid before updating
       if (typeof wireIndex === 'number' && wireIndex >= 0 && wireIndex < numQubits) {
          wireLayers[wireIndex] = maxLayer + 1;
       }
    });
    return maxLayer; // 门放置在计算出的最大层
  });

  const totalLayers = Math.max(0, ...wireLayers); // Ensure totalLayers is not negative

  // --- 计算 SVG 尺寸 ---
  // Add extra space if there are no layers (no gates)
  const calculatedWidth = totalLayers > 0 ? totalLayers * layerWidth : layerWidth;
  const svgWidth = padding * 2 + calculatedWidth;
  const svgHeight = padding * 2 + Math.max(0, numQubits - 1) * wireSpacing; // Ensure height is not negative

  // --- 生成 SVG 元素 ---
  const wireElements = [];
  for (let i = 0; i < numQubits; i++) {
    const y = padding + i * wireSpacing;
    wireElements.push(
      <line
        key={`wire-${i}`}
        x1={padding} y1={y}
        x2={svgWidth - padding} y2={y}
        stroke="gray"
        strokeWidth={lineStrokeWidth}
      />
    );
    wireElements.push(
      <text key={`label-${i}`} x={padding / 2} y={y + textOffsetY} fontSize="12" fill="black" textAnchor="middle">q{i}</text>
    );
  }

  const gateElements = gates.map((gate, index) => {
    // Validate gate wires before proceeding
    if (!Array.isArray(gate.wires) || gate.wires.some(w => typeof w !== 'number' || w < 0 || w >= numQubits)) {
      console.warn(`Skipping gate with invalid wires: ${JSON.stringify(gate)}`);
      return null; // Skip rendering this gate
    }

    const layer = gateLayer[index];
    const elements = [];
    const gateBaseColor = gateColors[gate.gate.toUpperCase()] || gateColors.DEFAULT;

    // 计算门的中心 X 坐标
    const cx = padding + layer * layerWidth + layerWidth / 2;

    // --- 处理单量子比特门 ---
    if (gate.wires.length === 1) {
      const wireIndex = gate.wires[0];
      const cy = padding + wireIndex * wireSpacing;

      // 绘制门方块
      elements.push(
        <rect
          key={`gate-${index}-rect`}
          x={cx - gateSize / 2}
          y={cy - gateSize / 2}
          width={gateSize}
          height={gateSize}
          fill={gateBaseColor}
          stroke="black"
          strokeWidth={gateStrokeWidth}
          rx="3"
        />
      );
      // 绘制门标签
      elements.push(
        <text
          key={`gate-${index}-text`}
          x={cx}
          y={cy + textOffsetY}
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="black"
        >
          {gate.gate}
        </text>
      );
      // 绘制参数 (如果存在)
      if (gate.params && gate.params.length > 0) {
        elements.push(
          <text
            key={`gate-${index}-param`}
            x={cx}
            y={cy + gateSize / 2 + paramOffsetY}
            textAnchor="middle"
            fontSize="9"
            fill="darkslategray"
          >
            ({gate.params.join(',')})
          </text>
        );
      }
    }
    // --- 处理双量子比特控制门 (简化假设：第一个是控制，第二个是目标) ---
    else if (gate.wires.length === 2 && (gate.gate.toUpperCase() === 'CX' || gate.gate.toUpperCase() === 'CZ')) {
        const controlWire = gate.wires[0];
        const targetWire = gate.wires[1];
        const controlY = padding + controlWire * wireSpacing;
        const targetY = padding + targetWire * wireSpacing;

        // 绘制连接线
        elements.push(
            <line
                key={`gate-${index}-line`}
                x1={cx} y1={controlY}
                x2={cx} y2={targetY}
                stroke="black"
                strokeWidth={lineStrokeWidth}
            />
        );

        // 绘制控制点
        elements.push(
            <circle
                key={`gate-${index}-control`}
                cx={cx} cy={controlY}
                r={controlRadius}
                fill="black"
            />
        );

        // 绘制目标点
        if (gate.gate.toUpperCase() === 'CX') {
            // CNOT Target (⊕)
            elements.push(
                <circle
                    key={`gate-${index}-target-circle`}
                    cx={cx} cy={targetY}
                    r={targetRadius}
                    fill={gateBaseColor} // Use gate color for target background
                    stroke="black"
                    strokeWidth={gateStrokeWidth}
                />,
                <line // Vertical line of ⊕
                    key={`gate-${index}-target-vline`}
                    x1={cx} y1={targetY - targetRadius}
                    x2={cx} y2={targetY + targetRadius}
                    stroke="black"
                    strokeWidth={gateStrokeWidth}
                />,
                <line // Horizontal line of ⊕
                    key={`gate-${index}-target-hline`}
                    x1={cx - targetRadius} y1={targetY}
                    x2={cx + targetRadius} y2={targetY}
                    stroke="black"
                    strokeWidth={gateStrokeWidth}
                />
            );
        } else if (gate.gate.toUpperCase() === 'CZ') {
            // CZ Target (filled circle or Z box) - Using a simple filled circle like control for now
             elements.push(
                <rect // Using a small box for Z target
                  key={`gate-${index}-target-z`}
                  x={cx - gateSize / 4}
                  y={targetY - gateSize / 4}
                  width={gateSize/2}
                  height={gateSize/2}
                  fill={gateColors.Z} // Use Z color
                  stroke="black"
                  strokeWidth={gateStrokeWidth}
                  rx="2"
                />
                 /* Alternative: Filled circle
                 <circle
                    key={`gate-${index}-target-cz`}
                    cx={cx} cy={targetY}
                    r={controlRadius}
                    fill="black" // CZ target often shown as filled circle
                 />
                 */
            );
        }
    }
    // --- 处理 SWAP 门 ---
    else if (gate.wires.length === 2 && gate.gate.toUpperCase() === 'SWAP') {
        const wire1 = gate.wires[0];
        const wire2 = gate.wires[1];
        const y1 = padding + wire1 * wireSpacing;
        const y2 = padding + wire2 * wireSpacing;

        // 绘制连接线
        elements.push(
            <line key={`gate-${index}-line`} x1={cx} y1={y1} x2={cx} y2={y2} stroke="black" strokeWidth={lineStrokeWidth} />
        );

        // 绘制两个 'X' 符号
        const crossSize = 5;
        [y1, y2].forEach((y, i) => {
            elements.push(
                <line key={`gate-${index}-swap${i}a`} x1={cx - crossSize} y1={y - crossSize} x2={cx + crossSize} y2={y + crossSize} stroke="black" strokeWidth={gateStrokeWidth} />,
                <line key={`gate-${index}-swap${i}b`} x1={cx - crossSize} y1={y + crossSize} x2={cx + crossSize} y2={y - crossSize} stroke="black" strokeWidth={gateStrokeWidth} />
            );
        });
    }
    // --- 其他多量子比特门 (简化表示) ---
    else if (gate.wires.length > 1) {
        // 绘制一个跨越多条线的矩形或标记
        const minYWire = Math.min(...gate.wires);
        const maxYWire = Math.max(...gate.wires);
        const minY = padding + minYWire * wireSpacing;
        const maxY = padding + maxYWire * wireSpacing;
        elements.push(
            <rect
                key={`gate-${index}-multi-rect`}
                x={cx - gateSize / 2}
                y={minY - gateSize / 4} // Smaller height for multi-qubit marker
                width={gateSize}
                height={maxY - minY + gateSize / 2}
                fill={gateBaseColor}
                stroke="black"
                strokeWidth={gateStrokeWidth}
                rx="3"
            />,
            <text
                key={`gate-${index}-multi-text`}
                x={cx}
                y={(minY + maxY) / 2 + textOffsetY}
                textAnchor="middle"
                fontSize="10"
                fontWeight="bold"
                fill="black"
            >
                {gate.gate}
            </text>
        );
         // Add vertical line
         elements.push(
            <line
                key={`gate-${index}-multi-line`}
                x1={cx} y1={minY}
                x2={cx} y2={maxY}
                stroke="black"
                strokeWidth={lineStrokeWidth}
                opacity="0.5" // Make line slightly transparent
            />
        );
    }

    return elements;
  }).filter(Boolean); // Filter out null elements from skipped gates

  return (
    <div className="mt-2 p-2 border border-gray-300 rounded bg-gray-100 overflow-x-auto">
      <p className="text-sm font-medium text-gray-700 px-2 pt-1">线路预览 (增强SVG):</p>
      {/* Add min-width to SVG to prevent squishing when few gates */}
      <svg width={svgWidth} height={svgHeight} xmlns="http://www.w3.org/2000/svg" className="my-2" style={{ minWidth: `${padding * 2 + layerWidth}px` }}>
        {wireElements}
        {gateElements.flat()}
      </svg>
      <p className="text-xs italic text-gray-600 px-2 pb-1">{circuitData?.details || ''}</p>
    </div>
  );
}


/**
 * 显示单个组件信息的卡片 (更新预览处理)
 * @param {string} title - 组件标题
 * @param {string} description - 组件描述
 * @param {string|object} previewData - 预览数据
 * @param {boolean} isCircuit - 指示预览是否为线路图
 */
function ComponentInfo({ title, description, previewData, isCircuit = false }) {
  const renderPreview = () => {
    if (isCircuit) {
      return <CircuitDiagram circuitData={previewData} />;
    } else if (previewData && typeof previewData === 'object') {
      // 更结构化的数据集预览
      return (
        <div className="mt-2 p-3 border border-gray-300 rounded bg-gray-50 text-sm text-gray-700">
          <p className="font-medium">数据预览 ({previewData.type || '信息'}):</p>
          <pre className="text-xs mt-1 whitespace-pre-wrap break-words">{previewData.info || '无预览信息'}</pre>
           {/* 可在此处添加更复杂的数据集预览，例如图表或图像占位符 */}
           {previewData.type === '图像' && <div className="mt-2 text-center text-gray-400 text-xs">[图像预览区域]</div>}
        </div>
      );
    } else {
      // 默认文本预览
      return (
        <div className="mt-2 p-3 border border-gray-300 rounded bg-gray-50 text-sm text-gray-700">
          <p className="font-medium">数据预览:</p>
          <p className="text-xs mt-1">{previewData || '无预览信息'}</p>
        </div>
      );
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4 border border-gray-200 hover:shadow-lg transition-shadow duration-200 flex flex-col">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 mb-2 flex-grow">{description}</p>
      {renderPreview()}
    </div>
  );
}

/**
 * 主应用组件 (添加 API 调用示例和错误处理)
 */
function App() {
  const [datasets, setDatasets] = useState([]);
  const [ansatze, setAnsatze] = useState([]);
  const [encodings, setEncodings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // 添加错误状态

  // 使用 useEffect 进行 API 调用
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null); // 重置错误状态
      try {
        // --- API 调用示例 (保持注释状态) ---
        // const [datasetsRes, ansatzeRes, encodingsRes] = await Promise.all([
        //   fetch('/api/datasets').catch(e => { throw new Error('无法获取数据集'); }),
        //   fetch('/api/ansatze').catch(e => { throw new Error('无法获取 Ansätze'); }),
        //   fetch('/api/encodings').catch(e => { throw new Error('无法获取基线编码'); })
        // ]);
        // if (!datasetsRes.ok) throw new Error('获取数据集失败');
        // if (!ansatzeRes.ok) throw new Error('获取 Ansätze 失败');
        // if (!encodingsRes.ok) throw new Error('获取基线编码失败');
        // const [datasetsData, ansatzeData, encodingsData] = await Promise.all([
        //   datasetsRes.json(),
        //   ansatzeRes.json(),
        //   encodingsRes.json()
        // ]);
        // setDatasets(datasetsData);
        // setAnsatze(ansatzeData);
        // setEncodings(encodingsData);

        // --- 使用模拟数据代替 API 调用 ---
        await new Promise(resolve => setTimeout(resolve, 700)); // 模拟网络延迟
        setDatasets(mockDatasets);
        setAnsatze(mockAnsatze);
        setEncodings(mockEncodings);
        // --- 模拟数据结束 ---

      } catch (err) {
        console.error("获取数据失败:", err);
        setError(err.message || '加载数据时发生未知错误');
        // 清空数据以避免显示旧数据
        setDatasets([]);
        setAnsatze([]);
        setEncodings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // 空依赖数组表示仅在组件挂载时运行一次

  // --- 渲染逻辑 ---
  let content;
  if (loading) {
    content = <div className="text-center text-gray-500 mt-10">加载中...</div>;
  } else if (error) {
    content = <div className="text-center text-red-600 mt-10">错误: {error}</div>;
  } else {
    content = (
      // 修改这里：移除 md: 前缀，始终保持三列
      <div className="grid grid-cols-3 gap-6">
        {/* 数据集部分 */}
        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">数据集</h2>
          {datasets.length > 0 ? datasets.map(item => (
            <ComponentInfo
              key={item.id}
              title={item.name}
              description={item.description}
              previewData={item.preview}
              isCircuit={false}
            />
          )) : <p className="text-sm text-gray-500">无可用数据集。</p>}
        </section>

        {/* Ansätze 部分 */}
        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">Ansätze (线路结构)</h2>
           {ansatze.length > 0 ? ansatze.map(item => (
            <ComponentInfo
              key={item.id}
              title={item.name}
              description={item.description}
              previewData={item.circuit}
              isCircuit={true}
            />
          )) : <p className="text-sm text-gray-500">无可用 Ansätze。</p>}
        </section>

        {/* 基线编码部分 */}
        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">基线编码</h2>
          {encodings.length > 0 ? encodings.map(item => (
            <ComponentInfo
              key={item.id}
              title={item.name}
              description={item.description}
              previewData={item.circuit}
              isCircuit={true}
            />
          )) : <p className="text-sm text-gray-500">无可用基线编码。</p>}
        </section>
      </div>
    );
  }

  return (
    // 保持 container mx-auto 以便内容居中，如果不需要居中可以移除
    <div className="container mx-auto p-4 font-sans bg-gray-50 min-h-screen">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">基准测试组件概览</h1>
        <p className="text-center text-gray-500 text-sm mt-1">查看用于评估量子编码的数据集、Ansätze 和基线编码。</p>
      </header>
      <main>
        {content}
      </main>
    </div>
  );
}

export default App; // 导出 App 组件
