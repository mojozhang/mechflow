
import React, { useState } from 'react';
import Header from './components/Header';
import ResourceConfig from './components/ResourceConfig';
import ProjectConfig from './components/ProjectConfig';
import ScheduleView from './components/ScheduleView';
import { Project, Resource, ScheduleResult, ProcessingType } from './types';
import { generateProductionSchedule } from './services/geminiService';
import { Settings, FileText, CalendarDays } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'resources' | 'projects' | 'schedule'>('projects');
  
  // Initial Mock Data Structure
  const [resources, setResources] = useState<Resource[]>([
    { id: '1', type: ProcessingType.Sawing, name: '卧式带锯床', count: 1 },
    { id: '2', type: ProcessingType.Lathe, name: '数控车床 A组', count: 1 },
    { id: '3', type: ProcessingType.Mill, name: '立式铣床', count: 1 },
    { id: '4', type: ProcessingType.Tapping, name: '自动攻丝机', count: 1 },
    { id: '5', type: ProcessingType.Welder, name: '高级焊工', count: 1 },
  ]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [schedule, setSchedule] = useState<ScheduleResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Logic
  const handleGenerateSchedule = async () => {
    setIsGenerating(true);
    setActiveTab('schedule');
    try {
      const result = await generateProductionSchedule(projects, resources);
      setSchedule(result);
    } catch (error) {
      alert("生成排程失败，请查看控制台了解详情。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTaskToggle = (taskId: string) => {
    if (!schedule) return;
    const newTasks = schedule.tasks.map(t => {
      if (t.taskId === taskId) {
        return {
          ...t,
          completed: !t.completed,
          completedAt: !t.completed ? new Date().toLocaleString('zh-CN', { hour12: false }) : undefined
        };
      }
      return t;
    });
    setSchedule({ ...schedule, tasks: newTasks });
  };

  const canGenerate = resources.length > 0 && projects.some(p => p.parts.some(part => part.analysisStatus === 'done'));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg mb-8 w-fit mx-auto md:mx-0">
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'resources' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <Settings className="w-4 h-4" /> 产能设置
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'projects' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <FileText className="w-4 h-4" /> 项目与零件
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'schedule' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <CalendarDays className="w-4 h-4" /> 生产排程
          </button>
        </div>

        {/* Content Area */}
        <div className="max-w-5xl">
          {activeTab === 'resources' && (
            <ResourceConfig resources={resources} setResources={setResources} />
          )}

          {activeTab === 'projects' && (
            <ProjectConfig 
              projects={projects} 
              setProjects={setProjects} 
              resources={resources}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleView 
              schedule={schedule}
              projects={projects}
              resources={resources}
              isLoading={isGenerating}
              onGenerate={handleGenerateSchedule}
              canGenerate={canGenerate}
              onTaskToggle={handleTaskToggle}
            />
          )}
        </div>
      </main>
      
      <footer className="bg-slate-100 border-t border-slate-200 py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} MechFlow 智能制造解决方案. Powered by Google Gemini.
        </div>
      </footer>
    </div>
  );
};

export default App;
