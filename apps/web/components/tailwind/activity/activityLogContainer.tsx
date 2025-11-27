import React from 'react';
import { FileText } from 'lucide-react';
import ActivityList from './activityList';
import { ActivityLog } from '../../../types/activityType';

interface ActivityLogContainerProps {
  logs?: ActivityLog[];
  isLogLoading?: boolean;
}

const ActivityLogContainer: React.FC<ActivityLogContainerProps> = ({ 
  logs = [],
  isLogLoading = false,
}) => {
  const isEmpty = !logs || logs.length === 0;
  
  return (
    <div className="w-full px-5">
      
      {/* Header */}
      {/* <div className='flex gap-3 items-center'>
        <p className="m-0 text-md font-semibold">Activity Log</p>
        <p className="m-0 text-xs text-gray-500 mt-1 dark:text-gray-400">
          {logs.length} {logs.length === 1 ? 'activity' : 'activities'}
        </p>
      </div> */}
      
      {/* Content Area */}
      {isLogLoading ? (
        <div className="flex items-center justify-center py-10 overflow-y-auto relative [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="min-h-auto w-full bg-background dark:bg-background sm:rounded-lg p-5">
            {/* Spinner */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative w-4 h-4">
                <div className="absolute inset-0 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Loading Activity...
              </span>
            </div>

            {/* Skeleton Lines */}
            <div className="space-y-3">
              <div className="h-7 w-3/4 rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
              <div className="h-4 w-full rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
              <div className="h-4 w-full rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
              <div className="h-4 w-2/3 rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 border-b border-gray-200 dark:border-gray-700 pb-5">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center">
              <p className=" m-2 text-sm font-medium text-gray-500 dark:text-gray-500">Nothing to show yet</p>
              <p className=" m-0 text-xs text-gray-400 dark:text-gray-600 mt-1">
                Activity will appear here once actions are performed
              </p>
            </div>
          ) : (
            <ActivityList logs={logs} />
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityLogContainer;
