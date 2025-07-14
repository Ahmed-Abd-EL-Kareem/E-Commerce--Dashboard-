import { useTranslation } from '../hooks/useTranslation';
import { FiPlus, FiSearch, FiFilter } from 'react-icons/fi';

const LocalizedPageHeader = ({ 
  title, 
  onAdd, 
  onSearch, 
  searchValue, 
  onSearchChange, 
  showAddButton = true,
  showSearch = true,
  addButtonText,
  searchPlaceholder 
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {title}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('common.loading')}...
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          {showSearch && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={searchPlaceholder || t('common.search')}
                value={searchValue}
                onChange={onSearchChange}
                className="block w-full pl-10 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          )}

          {/* Filter Button */}
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <FiFilter className="h-4 w-4 mr-2" />
            {t('common.filter')}
          </button>

          {/* Add Button */}
          {showAddButton && (
            <button
              onClick={onAdd}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FiPlus className="h-4 w-4 mr-2" />
              {addButtonText || t('common.add')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocalizedPageHeader; 