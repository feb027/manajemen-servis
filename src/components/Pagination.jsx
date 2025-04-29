// src/components/Pagination.jsx
import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// Simple hook for pagination logic (can be expanded)
const DOTS = '...';
const usePagination = ({
  totalCount,
  pageSize,
  siblingCount = 1,
  currentPage
}) => {
  const paginationRange = React.useMemo(() => {
    const totalPageCount = Math.ceil(totalCount / pageSize);

    // Pages count is determined as siblingCount + firstPage + lastPage + currentPage + 2*DOTS
    const totalPageNumbers = siblingCount + 5;

    /*
      If the number of pages is less than the page numbers we want to show in our
      paginationComponent, we return the range [1..totalPageCount]
    */
    if (totalPageNumbers >= totalPageCount) {
      return range(1, totalPageCount);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(
      currentPage + siblingCount,
      totalPageCount
    );

    /*
      We do not want to show dots if there is only one position left
      after/before the left/right page count as that would lead to a change if our Pagination
      component size which we do not want
    */
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPageCount - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPageCount;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = range(1, leftItemCount);

      return [...leftRange, DOTS, totalPageCount];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      let rightRange = range(
        totalPageCount - rightItemCount + 1,
        totalPageCount
      );
      return [firstPageIndex, DOTS, ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
    }

    // Added fallback to prevent potential undefined return
    return range(1, totalPageCount);
  }, [totalCount, pageSize, siblingCount, currentPage]);

  return paginationRange;
};

const range = (start, end) => {
  let length = end - start + 1;
  return Array.from({ length }, (_, idx) => idx + start);
};

function Pagination({
  onPageChange,
  totalCount,
  siblingCount = 1,
  currentPage,
  pageSize,
}) {

  const paginationRange = usePagination({
    currentPage,
    totalCount,
    siblingCount,
    pageSize
  });

  // If there are less than 2 times in pagination range we shall not render the component
  if (currentPage === 0 || !paginationRange || paginationRange.length < 2) {
    return null;
  }

  const onNext = () => {
    onPageChange(currentPage + 1);
  };

  const onPrevious = () => {
    onPageChange(currentPage - 1);
  };

  let lastPage = paginationRange[paginationRange.length - 1];

  const baseButtonClass = "relative inline-flex items-center px-3 py-1.5 text-sm font-medium border focus:z-10 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors duration-150";
  const defaultButtonClass = "bg-white border-gray-300 text-gray-700 hover:bg-sky-50 hover:text-sky-600";
  const activeButtonClass = "z-10 bg-sky-600 border-sky-600 text-white hover:bg-sky-700";
  const disabledButtonClass = "bg-gray-100 border-gray-300 text-gray-400 opacity-70 cursor-not-allowed";
  const dotsClass = "relative inline-flex items-center px-3 py-1.5 border border-gray-300 bg-white text-sm font-medium text-gray-400";

  return (
    <nav className="flex items-center justify-between bg-white px-4 py-2 sm:px-6 rounded-b-lg" aria-label="Pagination">
       {/* Showing X to Y results - Adjusted text color */}
       <div className="hidden sm:block">
         <p className="text-sm text-gray-600">
            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of
            <span className="font-medium"> {totalCount} </span> results
         </p>
       </div>
       {/* Pagination controls container */}
      <div className="flex items-center justify-between sm:justify-end">
        {/* Previous Button */}
        <button
          onClick={onPrevious}
          disabled={currentPage === 1}
          className={`${baseButtonClass} rounded-l-md ${currentPage === 1 ? disabledButtonClass : defaultButtonClass }`}
          aria-label="Previous page"
        >
           <span className="sr-only">Previous</span>
           <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        
        {/* Page Numbers and Dots */}
        {paginationRange.map((pageNumber, index) => {
          // Dots element
          if (pageNumber === DOTS) {
            return <span key={`dots-${index}`} className={`${dotsClass} -ml-px`}>...</span>;
          }

          // Page number button
          return (
            <button
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={`${baseButtonClass} -ml-px ${currentPage === pageNumber ? activeButtonClass : defaultButtonClass}`}
              aria-current={currentPage === pageNumber ? 'page' : undefined}
              aria-label={currentPage === pageNumber ? `Current page, Page ${pageNumber}` : `Go to page ${pageNumber}`}
            >
              {pageNumber}
            </button>
          );
        })}
        
        {/* Next Button */}
        <button
          onClick={onNext}
          disabled={currentPage === lastPage}
          className={`${baseButtonClass} rounded-r-md -ml-px ${currentPage === lastPage ? disabledButtonClass : defaultButtonClass}`}
          aria-label="Next page"
        >
           <span className="sr-only">Next</span>
           <FiChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

export default Pagination;