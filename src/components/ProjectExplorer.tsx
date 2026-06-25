import React, { useState, useMemo } from 'react';
import { fileTree } from '../fileTree';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface ProjectExplorerProps {
  initialPath?: string;
  onOpenFile?: (path: string) => void;
  className?: string;
}

const ProjectExplorer: React.FC<ProjectExplorerProps> = ({ initialPath = 'projects', onOpenFile, className = '' }) => {
  const [currentPath, setCurrentPath] = useState<string[]>(initialPath.split('/'));
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({ [initialPath]: true });

  const currentNode = useMemo(() => {
    let node: FileNode = fileTree as FileNode;
    // The tree starts at 'projects', if our path starts with 'projects' we skip the first part if it matches
    const pathParts = currentPath[0] === 'projects' ? currentPath.slice(1) : currentPath;

    for (const part of pathParts) {
      const nextNode = node.children?.find(child => child.name === part);
      if (nextNode) {
        node = nextNode;
      } else {
        break;
      }
    }
    return node;
  }, [currentPath]);

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const navigateTo = (path: string) => {
    setCurrentPath(path.split('/'));
  };

  const renderBreadcrumbs = () => {
    return (
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-4 overflow-x-auto whitespace-nowrap pb-2">
        {currentPath.map((part, i) => {
          const path = currentPath.slice(0, i + 1).join('/');
          return (
            <React.Fragment key={path}>
              {i > 0 && <span>/</span>}
              <button
                onClick={() => navigateTo(path)}
                className="hover:text-zinc-200 transition-colors"
              >
                {part}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const getIcon = (type: 'file' | 'directory', name: string) => {
    if (type === 'directory') return '📁';
    if (name.endsWith('.mp3')) return '🎵';
    if (name.endsWith('.html')) return '🌐';
    if (name.endsWith('.py') || name.endsWith('.ts') || name.endsWith('.js')) return '📜';
    if (name.endsWith('.md')) return '📖';
    if (name.endsWith('.ipynb')) return '📓';
    return '📄';
  };

  return (
    <div className={`flex flex-col h-full bg-black/40 border border-zinc-800 rounded-sm font-mono ${className}`}>
      <div className="bg-zinc-900/80 px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">File Explorer</span>
        <span className="text-[10px] text-zinc-600">v1.0.0-stable</span>
      </div>

      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        {renderBreadcrumbs()}

        <div className="space-y-1">
          {currentPath.length > 1 && (
            <button
              onClick={() => navigateTo(currentPath.slice(0, -1).join('/'))}
              className="flex items-center gap-3 w-full text-left px-2 py-1.5 text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all group"
            >
              <span className="opacity-60">⤴</span>
              <span>..</span>
            </button>
          )}

          {currentNode.children?.map((child) => (
            <div key={child.path}>
              <button
                onClick={() => {
                  if (child.type === 'directory') {
                    navigateTo(child.path);
                  } else if (onOpenFile) {
                    onOpenFile(child.path);
                  }
                }}
                className={`flex items-center gap-3 w-full text-left px-2 py-1.5 text-sm transition-all group
                           ${child.type === 'directory' ? 'text-zinc-300 hover:text-white' : 'text-zinc-400 hover:text-zinc-200'}
                           hover:bg-zinc-800/50`}
              >
                <span className="text-base group-hover:scale-110 transition-transform">
                  {getIcon(child.type, child.name)}
                </span>
                <span className="flex-1 truncate">{child.name}</span>
                {child.type === 'directory' && (
                  <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400">DIR</span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/30 px-4 py-1.5 border-t border-zinc-800/50 text-[10px] text-zinc-600 flex justify-between">
        <span>{currentNode.children?.length || 0} items</span>
        <span className="truncate max-w-[200px]">PATH: /{currentPath.join('/')}</span>
      </div>
    </div>
  );
};

export default ProjectExplorer;
