import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Part, Project, Resource, ScheduleResult, ProcessingType } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- 1. PDF Analysis ---

export const analyzePartDrawing = async (
  base64Data: string,
  mimeType: string,
  availableResources: Resource[]
): Promise<{ name: string; steps: { processType: string; estimatedHours: number; description: string }[] }> => {
  
  const resourceList = availableResources.map(r => r.type).join(', ');

  const prompt = `
    你是一位专业的机械工程师，专攻制造工艺规划。
    
    附件是一个机械零件的技术图纸（PDF 或 图片）。
    
    任务：
    1. 识别零件名称。
    2. 分析几何形状，确定制造所需的标准工艺步骤。
    3. **产能匹配检查**：
       - 当前工厂具备以下加工能力：[${resourceList}]。
       - 对于每一步，如果所需的工艺包含在上述列表中，请准确使用列表中的名称（例如“车床”）。
       - **关键**：如果某个步骤需要的工艺**不在**上述列表中（例如需要“磨床”或“热处理”但列表中没有），请务必填写该工艺的标准行业名称，不要强行映射到现有资源上，以便系统能发出产能报警。
    4. 估算熟练工人完成每一步所需的时间（小时）。

    请以 JSON 格式返回结果。
  `;

  // Define Schema for strict JSON output
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      partName: { type: Type.STRING, description: "从图纸中找到的零件名称或推断的名称。" },
      steps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            processType: { type: Type.STRING, description: "工艺类型。如果工厂有该能力，使用工厂资源名称；否则使用标准名称。" },
            estimatedHours: { type: Type.NUMBER, description: "预计时间（小时）。" },
            description: { type: Type.STRING, description: "操作简述（例如：'车削外圆'）。" }
          },
          required: ["processType", "estimatedHours", "description"]
        }
      }
    },
    required: ["partName", "steps"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      name: result.partName || "未知零件",
      steps: result.steps || []
    };
  } catch (error) {
    console.error("Error analyzing drawing:", error);
    throw new Error("图纸分析失败，请确保PDF清晰。");
  }
};

// --- 2. Production Scheduling ---

export const generateProductionSchedule = async (
  projects: Project[],
  resources: Resource[]
): Promise<ScheduleResult> => {

  // Prepare context for the AI
  const projectContext = projects.map(p => ({
    projectId: p.id,
    projectName: p.name,
    deadline: p.deadline,
    parts: p.parts.map(part => ({
      partId: part.id,
      partName: part.name,
      steps: part.steps,
      warnings: part.warnings // Include warnings so AI knows about issues
    }))
  }));

  const resourceContext = resources.map(r => ({
    id: r.id,
    type: r.type,
    name: r.name,
    count: r.count
  }));

  const prompt = `
    你是一个高级生产排程系统 (APS)。
    
    **输入数据**：
    1. 项目列表（包含零件、工艺步骤、截止日期）：${JSON.stringify(projectContext)}
    2. 可用资源（机器/人员）：${JSON.stringify(resourceContext)}

    **任务**：
    为所有零件的所有工序安排生产时间表。
    
    **核心规则**：
    1. **资源约束**：同一台机器（Resource ID）在同一时间段内只能处理一个任务。请基于资源数量进行分配。
    2. **工序顺序**：每个零件的工序必须按顺序执行（步骤 2 必须在步骤 1 完成后开始）。
    3. **截止日期优先**：优先安排截止日期较近的项目。
    4. **外发处理（关键）**：如果某个工序需要的工艺类型（processType）在可用资源列表中**完全找不到对应的类型**，请**务必**将该任务安排进日程，但标记为“外发”。
       - Resource Name 设为 "外发-[工艺名]" (例如: "外发-热处理")。
       - Resource ID 设为 "OUTSOURCE"。
       - 假设外发资源无限，可以并行处理，不占用工厂内部机器。
    5. 时间单位为小时，从 T=0 开始。

    **输出要求**：
    返回 JSON 对象，包含：
    - totalDuration: 完成所有任务所需的总小时数。
    - explanation: 简要说明排产策略，**必须**明确指出哪些工艺因为工厂没有产能而被安排为外发。
    - tasks: 任务列表。每个任务包含：
      - taskId (唯一字符串)
      - partId
      - partName
      - projectId
      - projectName
      - resourceId (使用的具体资源ID，或是 'OUTSOURCE')
      - resourceName (资源名称，或是 '外发-xxx')
      - startTime (小时)
      - duration (小时)
      - description (工序描述)

    请确保 JSON 格式合法。
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      totalDuration: { type: Type.NUMBER },
      explanation: { type: Type.STRING },
      tasks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            taskId: { type: Type.STRING },
            partId: { type: Type.STRING },
            partName: { type: Type.STRING },
            projectId: { type: Type.STRING },
            projectName: { type: Type.STRING },
            resourceId: { type: Type.STRING },
            resourceName: { type: Type.STRING },
            startTime: { type: Type.NUMBER },
            duration: { type: Type.NUMBER },
            description: { type: Type.STRING }
          },
          required: ["taskId", "partId", "resourceId", "startTime", "duration"]
        }
      }
    },
    required: ["totalDuration", "tasks", "explanation"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { text: prompt },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
        totalDuration: result.totalDuration || 0,
        explanation: result.explanation || "排产完成",
        tasks: result.tasks || []
    };
  } catch (error) {
    console.error("Scheduling failed:", error);
    throw new Error("排产计算失败。");
  }
};
