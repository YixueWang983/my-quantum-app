import React, { useState, useEffect } from 'react';

// --- 模拟数据 (保持不变) ---
const mockDatasets = [
  { id: 'ds1', name: '数据集 A', description: '用于二元分类的简单数据集。', preview: { type: '统计', info: '样本数: 100, 特征数: 4, 类别: 2' } },
  { id: 'ds2', name: '数据集 B', description: '包含更多特征的复杂数据集。', preview: { type: '样本', info: '[ [0.1, 0.2], [0.9, 0.8], ... ]' } },
   { id: 'ds3', name: '数据集 C (图像)', description: 'MNIST 手写数字子集。', preview: { type: '图像', info: '尺寸: 8x8, 类别: 2 (0 vs 1)', placeholder: '80x80/cccccc/000000?text=8x8+Digit' } },
];
const mockAnsatze = [ /* ... (省略 Ansätze 数据) ... */
   { id: 'an1', name: 'Ansatz 1 (硬件高效型)', description: '一种常用的变分线路结构。', circuit: { num_qubits: 3, gates: [ { gate: 'H', wires: [0], params: [] }, { gate: 'H', wires: [1], params: [] }, { gate: 'H', wires: [2], params: [] }, { gate: 'CX', wires: [0, 1], params: [] }, { gate: 'RY', wires: [0], params: ['θ1'] }, { gate: 'CX', wires: [1, 2], params: [] }, { gate: 'RY', wires: [1], params: ['θ2'] }, { gate: 'RZ', wires: [2], params: ['θ3'] }, { gate: 'CX', wires: [0, 1], params: [] }, { gate: 'CX', wires: [1, 2], params: [] }, ], details: '深度: 6, 参数: 3' } },
   { id: 'an2', name: 'Ansatz 2 (问题启发型)', description: '针对特定问题设计的线路。', circuit: { num_qubits: 2, gates: [ { gate: 'RY', wires: [0], params: ['θ1'] }, { gate: 'RY', wires: [1], params: ['θ2'] }, { gate: 'CZ', wires: [0, 1], params: [] }, { gate: 'RX', wires: [0], params: ['θ3'] }, { gate: 'RX', wires: [1], params: ['θ4'] }, ], details: '深度: 3, 参数: 4' } },
];
const mockEncodings = [ /* ... (省略 Encodings 数据) ... */
   { id: 'en1', name: '基线编码 1 (角度编码)', description: '将数据编码为旋转门的角度。', circuit: { num_qubits: 2, gates: [ { gate: 'RX', wires: [0], params: ['x1'] }, { gate: 'RX', wires: [1], params: ['x2'] } ], details: '深度: 1' } },
   { id: 'en2', name: '基线编码 2 (稠密编码)', description: '更复杂的特征映射。', circuit: { num_qubits: 3, gates: [ { gate: 'H', wires: [0], params: [] }, { gate: 'H', wires: [1], params: [] }, { gate: 'H', wires: [2], params: [] }, { gate: 'RZ', wires: [0], params: ['x1'] }, { gate: 'RZ', wires: [1], params: ['x2'] }, { gate: 'RZ', wires: [2], params: ['x3'] }, { gate: 'CX', wires: [0, 1], params: [] }, { gate: 'CX', wires: [1, 2], params: [] }, { gate: 'RZ', wires: [0], params: ['x4'] }, { gate: 'RZ', wires: [1], params: ['x5'] }, { gate: 'RZ', wires: [2], params: ['x6'] }, ], details: '深度: 5' } },
];
// --- 模拟数据结束 ---


// --- 组件定义 (CircuitDiagram, ComponentInfo 保持不变) ---
/**
 * 增强版 SVG 量子线路图组件
 * @param {object} circuitData - 包含线路信息的对象 (num_qubits, gates)
 * @param {string} [title="线路预览 (增强SVG):"] - 可选的标题
 */
function CircuitDiagram({ circuitData, title = "线路预览 (增强SVG):" }) {
    // --- 验证输入数据 ---
    if (!circuitData || typeof circuitData !== 'object' || !Array.isArray(circuitData.gates) || typeof circuitData.num_qubits !== 'number' || circuitData.num_qubits <= 0) {
        let inferredQubits = 0;
        if (Array.isArray(circuitData?.gates) && circuitData.gates.length > 0) {
            circuitData.gates.forEach(gate => {
                if (Array.isArray(gate?.wires)) {
                    inferredQubits = Math.max(inferredQubits, ...gate.wires.map(w => (typeof w === 'number' ? w + 1 : 0)));
                }
            });
        }
        if (inferredQubits > 0) {
            console.warn("Circuit data missing or invalid 'num_qubits', inferring from gates:", inferredQubits);
            circuitData = { ...circuitData, num_qubits: inferredQubits };
        } else {
            return <div className="mt-2 text-center text-gray-400 text-xs p-4 border border-dashed border-red-300 bg-red-50 rounded">[无效或不完整的线路数据]</div>;
        }
    }

    const numQubits = circuitData.num_qubits;
    const gates = circuitData.gates;
    // ... (SVG 绘制逻辑保持不变) ...
      // --- 布局和样式常量 ---
    const wireSpacing = 50; const gateSize = 32; const layerWidth = 50; const padding = 25;
    const textOffsetY = 4; const paramOffsetY = 10; const controlRadius = 4; const targetRadius = 8;
    const lineStrokeWidth = 1.5; const gateStrokeWidth = 1;
    const gateColors = { H: '#a6d8f0', X: '#f0a6a6', Y: '#f0a6a6', Z: '#f0a6a6', RX: '#a6f0c3', RY: '#a6f0c3', RZ: '#a6f0c3', CX: '#cccccc', CZ: '#cccccc', SWAP: '#f0d8a6', DEFAULT: '#e0e0e0', };
    // --- 布局计算 ---
    const wireLayers = Array(numQubits).fill(0);
    const gateLayer = gates.map(gate => { let maxLayer = 0; if (!Array.isArray(gate?.wires)) { console.warn(`Gate invalid wires: ${JSON.stringify(gate)}`); return 0; } gate.wires.forEach(wireIndex => { if (typeof wireIndex === 'number' && wireIndex >= 0 && wireIndex < numQubits) { maxLayer = Math.max(maxLayer, wireLayers[wireIndex]); } else { console.warn(`Invalid wire index: ${wireIndex}`, gate); } }); gate.wires.forEach(wireIndex => { if (typeof wireIndex === 'number' && wireIndex >= 0 && wireIndex < numQubits) { wireLayers[wireIndex] = maxLayer + 1; } }); return maxLayer; });
    const totalLayers = Math.max(0, ...wireLayers);
    // --- 计算 SVG 尺寸 ---
    const calculatedWidth = totalLayers > 0 ? totalLayers * layerWidth : layerWidth; const svgWidth = padding * 2 + calculatedWidth; const svgHeight = padding * 2 + Math.max(0, numQubits - 1) * wireSpacing;
    // --- 生成 SVG 元素 ---
    const wireElements = []; for (let i = 0; i < numQubits; i++) { const y = padding + i * wireSpacing; wireElements.push( <line key={`wire-${i}`} x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="gray" strokeWidth={lineStrokeWidth} /> ); wireElements.push( <text key={`label-${i}`} x={padding / 2} y={y + textOffsetY} fontSize="12" fill="black" textAnchor="middle">q{i}</text> ); }
    const gateElements = gates.map((gate, index) => { if (!Array.isArray(gate?.wires) || gate.wires.some(w => typeof w !== 'number' || w < 0 || w >= numQubits)) { console.warn(`Skipping invalid gate: ${JSON.stringify(gate)}`); return null; } const layer = gateLayer[index]; const elements = []; const gateType = gate.gate?.toUpperCase() || 'UNKNOWN'; const gateBaseColor = gateColors[gateType] || gateColors.DEFAULT; const cx = padding + layer * layerWidth + layerWidth / 2; if (gate.wires.length === 1) { const wireIndex = gate.wires[0]; const cy = padding + wireIndex * wireSpacing; elements.push( <rect key={`g-${index}-r`} x={cx - gateSize / 2} y={cy - gateSize / 2} width={gateSize} height={gateSize} fill={gateBaseColor} stroke="black" strokeWidth={gateStrokeWidth} rx="3" /> ); elements.push( <text key={`g-${index}-t`} x={cx} y={cy + textOffsetY} textAnchor="middle" fontSize="11" fontWeight="bold" fill="black">{gate.gate}</text> ); if (gate.params && gate.params.length > 0) { elements.push( <text key={`g-${index}-p`} x={cx} y={cy + gateSize / 2 + paramOffsetY} textAnchor="middle" fontSize="9" fill="darkslategray">({gate.params.join(',')})</text> ); } } else if (gate.wires.length === 2 && (gateType === 'CX' || gateType === 'CZ')) { const controlWire = gate.wires[0]; const targetWire = gate.wires[1]; const controlY = padding + controlWire * wireSpacing; const targetY = padding + targetWire * wireSpacing; elements.push( <line key={`g-${index}-l`} x1={cx} y1={controlY} x2={cx} y2={targetY} stroke="black" strokeWidth={lineStrokeWidth} /> ); elements.push( <circle key={`g-${index}-c`} cx={cx} cy={controlY} r={controlRadius} fill="black" /> ); if (gateType === 'CX') { elements.push( <circle key={`g-${index}-tgt-c`} cx={cx} cy={targetY} r={targetRadius} fill={gateBaseColor} stroke="black" strokeWidth={gateStrokeWidth} /> ); elements.push( <line key={`g-${index}-tgt-v`} x1={cx} y1={targetY - targetRadius} x2={cx} y2={targetY + targetRadius} stroke="black" strokeWidth={gateStrokeWidth} /> ); elements.push( <line key={`g-${index}-tgt-h`} x1={cx - targetRadius} y1={targetY} x2={cx + targetRadius} y2={targetY} stroke="black" strokeWidth={gateStrokeWidth} /> ); } else { elements.push( <rect key={`g-${index}-tgt-z`} x={cx-gateSize/4} y={targetY-gateSize/4} width={gateSize/2} height={gateSize/2} fill={gateColors.Z} stroke="black" strokeWidth={gateStrokeWidth} rx="2" /> ); } } else if (gate.wires.length === 2 && gateType === 'SWAP') { const wire1 = gate.wires[0]; const wire2 = gate.wires[1]; const y1 = padding + wire1 * wireSpacing; const y2 = padding + wire2 * wireSpacing; elements.push( <line key={`g-${index}-l`} x1={cx} y1={y1} x2={cx} y2={y2} stroke="black" strokeWidth={lineStrokeWidth} /> ); const crossSize = 5; [y1, y2].forEach((y, i) => { elements.push( <line key={`g-${index}-sw${i}a`} x1={cx - crossSize} y1={y - crossSize} x2={cx + crossSize} y2={y + crossSize} stroke="black" strokeWidth={gateStrokeWidth} /> ); elements.push( <line key={`g-${index}-sw${i}b`} x1={cx - crossSize} y1={y + crossSize} x2={cx + crossSize} y2={y - crossSize} stroke="black" strokeWidth={gateStrokeWidth} /> ); }); } else if (gate.wires.length > 1) { const minYWire = Math.min(...gate.wires); const maxYWire = Math.max(...gate.wires); const minY = padding + minYWire * wireSpacing; const maxY = padding + maxYWire * wireSpacing; elements.push( <rect key={`g-${index}-mr`} x={cx - gateSize / 2} y={minY - gateSize / 4} width={gateSize} height={maxY - minY + gateSize / 2} fill={gateBaseColor} stroke="black" strokeWidth={gateStrokeWidth} rx="3" /> ); elements.push( <text key={`g-${index}-mt`} x={cx} y={(minY + maxY) / 2 + textOffsetY} textAnchor="middle" fontSize="10" fontWeight="bold" fill="black">{gate.gate}</text> ); elements.push( <line key={`g-${index}-ml`} x1={cx} y1={minY} x2={cx} y2={maxY} stroke="black" strokeWidth={lineStrokeWidth} opacity="0.5" /> ); } return elements; }).filter(Boolean);

    return ( <div className="mt-2 p-2 border border-gray-300 rounded bg-gray-100 overflow-x-auto"> <p className="text-sm font-medium text-gray-700 px-2 pt-1">{title}</p> <svg width={svgWidth} height={svgHeight} xmlns="http://www.w3.org/2000/svg" className="my-2" style={{ minWidth: `${padding * 2 + layerWidth}px` }}> {wireElements} {gateElements.flat()} </svg> {circuitData?.details && <p className="text-xs italic text-gray-600 px-2 pb-1">{circuitData.details}</p>} </div> );
}
/**
 * 显示单个组件信息的卡片
 */
function ComponentInfo({ title, description, previewData, isCircuit = false }) {
    const renderPreview = () => { if (isCircuit) { return <CircuitDiagram circuitData={previewData} />; } else if (previewData && typeof previewData === 'object') { if (previewData.type === '图像') { const imageUrl = previewData.imageUrl || `https://placehold.co/${previewData.placeholder || '80x80/eee/aaa?text=Image'}`; const fallbackImageUrl = `https://placehold.co/80x80/f0f0f0/ccc?text=Error`; return ( <div className="mt-2 p-3 border border-gray-300 rounded bg-gray-50 text-sm text-gray-700"> <p className="font-medium">数据预览 ({previewData.type}):</p> <p className="text-xs mt-1 mb-2">{previewData.info || '无预览信息'}</p> <img src={imageUrl} alt={`${title} preview`} className="mx-auto my-1 border border-gray-200 rounded" width="80" height="80" onError={(e) => { e.target.onerror = null; e.target.src = fallbackImageUrl; }} /> </div> ); } return ( <div className="mt-2 p-3 border border-gray-300 rounded bg-gray-50 text-sm text-gray-700"> <p className="font-medium">数据预览 ({previewData.type || '信息'}):</p> <pre className="text-xs mt-1 whitespace-pre-wrap break-words">{previewData.info || '无预览信息'}</pre> </div> ); } else { return ( <div className="mt-2 p-3 border border-gray-300 rounded bg-gray-50 text-sm text-gray-700"> <p className="font-medium">数据预览:</p> <p className="text-xs mt-1">{previewData || '无预览信息'}</p> </div> ); } };
    return ( <div className="bg-white shadow-md rounded-lg p-4 mb-4 border border-gray-200 hover:shadow-lg transition-shadow duration-200 flex flex-col"> <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3> <p className="text-sm text-gray-600 mb-2 flex-grow">{description}</p> {renderPreview()} </div> );
}
/**
 * 编码上传组件
 */
function EncodingUploader() {
    const [uploadedCircuit, setUploadedCircuit] = useState(null); const [fileName, setFileName] = useState(''); const [error, setError] = useState('');
    const handleFileChange = (event) => { const file = event.target.files[0]; if (!file) return; if (file.type !== 'application/json') { setError('请上传 JSON 格式的文件。'); setUploadedCircuit(null); setFileName(''); event.target.value = null; return; } setFileName(file.name); setError(''); setUploadedCircuit(null); const reader = new FileReader(); reader.onload = (e) => { try { const content = e.target.result; const parsedData = JSON.parse(content); if (typeof parsedData === 'object' && parsedData !== null && Array.isArray(parsedData.gates) && (typeof parsedData.num_qubits === 'number' || Array.isArray(parsedData.gates))) { setUploadedCircuit(parsedData); } else { console.error("解析后的 JSON 格式不符合预期:", parsedData); setError('上传的 JSON 文件格式无效或缺少必要的字段 (例如 "gates", "num_qubits")。'); } } catch (parseError) { console.error("解析 JSON 文件时出错:", parseError); setError(`无法解析文件 "${file.name}"：请确保它是有效的 JSON 格式。`); setUploadedCircuit(null); } }; reader.onerror = (e) => { console.error("读取文件时出错:", e); setError(`读取文件 "${file.name}" 时出错。`); setUploadedCircuit(null); }; reader.readAsText(file); };
    const triggerFileInput = () => { document.getElementById('encodingFileInput').click(); };
    return ( <section className="mb-8 p-4 border border-dashed border-indigo-300 rounded-lg bg-indigo-50"> <h2 className="text-xl font-semibold mb-3 text-indigo-800">上传你的编码 (任务 2.1)</h2> <input type="file" id="encodingFileInput" accept=".json" onChange={handleFileChange} className="hidden" /> <button onClick={triggerFileInput} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"> 选择编码文件 (.json) </button> {fileName && <p className="text-sm text-gray-600 mt-2">已选择文件: {fileName}</p>} {error && <p className="text-sm text-red-600 mt-2 bg-red-100 p-2 rounded border border-red-300">{error}</p>} {uploadedCircuit && ( <div className="mt-4"> <CircuitDiagram circuitData={uploadedCircuit} title="上传的编码预览:" /> </div> )} </section> );
}
/**
 * 基准组件显示部分
 */
function BenchmarkDisplay({ datasets, ansatze, encodings, loading, error }) {
     let benchmarkContent;
     if (loading) { benchmarkContent = <div className="text-center text-gray-500 mt-10 col-span-3">加载基准组件中...</div>; }
     else if (error) { benchmarkContent = <div className="text-center text-red-600 mt-10 col-span-3">错误: {error}</div>; }
     else { benchmarkContent = ( <> <section> <h2 className="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">数据集 (任务 2.2)</h2> {datasets.length > 0 ? datasets.map(item => ( <ComponentInfo key={item.id} title={item.name} description={item.description} previewData={item.preview} isCircuit={false} /> )) : <p className="text-sm text-gray-500">无可用数据集。</p>} </section> <section> <h2 className="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">Ansätze (线路结构) (任务 2.2)</h2> {ansatze.length > 0 ? ansatze.map(item => ( <ComponentInfo key={item.id} title={item.name} description={item.description} previewData={item.circuit} isCircuit={true} /> )) : <p className="text-sm text-gray-500">无可用 Ansätze。</p>} </section> <section> <h2 className="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">基线编码 (任务 2.2)</h2> {encodings.length > 0 ? encodings.map(item => ( <ComponentInfo key={item.id} title={item.name} description={item.description} previewData={item.circuit} isCircuit={true} /> )) : <p className="text-sm text-gray-500">无可用基线编码。</p>} </section> </> ); }
     return ( <div className="grid grid-cols-3 gap-6"> {benchmarkContent} </div> );
}

/**
 * 主应用组件 (添加视图切换)
 */
function App() {
  const [datasets, setDatasets] = useState([]);
  const [ansatze, setAnsatze] = useState([]);
  const [encodings, setEncodings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('benchmark'); // 'benchmark' 或 'upload'

  // useEffect 获取基准数据
  useEffect(() => {
    // 只在需要显示基准数据时加载
    if (currentView === 'benchmark') {
        const fetchData = async () => {
          setLoading(true); setError(null);
          try {
            await new Promise(resolve => setTimeout(resolve, 500)); // 模拟延迟
            setDatasets(mockDatasets); setAnsatze(mockAnsatze); setEncodings(mockEncodings);
          } catch (err) {
            console.error("获取基准数据失败:", err); setError(err.message || '加载基准数据时发生未知错误');
            setDatasets([]); setAnsatze([]); setEncodings([]);
          } finally { setLoading(false); }
        };
        fetchData();
    } else {
        // 如果切换到上传视图，可以考虑清除基准数据或保持不变
        // setLoading(false); // 确保不在上传视图时显示加载
    }
  }, [currentView]); // 当 currentView 变化时重新运行 effect

  return (
    <div className="container mx-auto p-4 font-sans bg-gray-50 min-h-screen">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">量子编码基准测试框架</h1>
        {/* 添加视图切换按钮 */}
        <nav className="mt-4 flex justify-center space-x-4">
           <button
             onClick={() => setCurrentView('benchmark')}
             className={`py-2 px-4 rounded font-semibold transition duration-150 ease-in-out ${
                currentView === 'benchmark'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
             }`}
           >
             查看基准组件 (2.2)
           </button>
           <button
             onClick={() => setCurrentView('upload')}
             className={`py-2 px-4 rounded font-semibold transition duration-150 ease-in-out ${
                currentView === 'upload'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
             }`}
           >
             上传编码 (2.1)
           </button>
        </nav>
      </header>
      <main>
        {/* 根据当前视图条件渲染 */}
        {currentView === 'benchmark' && (
          <BenchmarkDisplay
            datasets={datasets}
            ansatze={ansatze}
            encodings={encodings}
            loading={loading}
            error={error}
          />
        )}
        {currentView === 'upload' && <EncodingUploader />}
      </main>
    </div>
  );
}

export default App;
