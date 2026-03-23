import { type FC } from "react";

interface PaginatorProps {
    totalPages: number;
    activePage: number;
    onPageChange: (page: number) => void;
};

const Paginator: FC<PaginatorProps> = ({totalPages, activePage, onPageChange}) => {
    const isFirst = (activePage <= 1);
    const isLast = (activePage >= totalPages);
    return (
        <div className="flex items-center gap-2">
            <button
                disabled={isFirst}
                onClick={ () => { onPageChange(Math.max(1, activePage - 1));  } }
                className="px-2 py-1 hover:underline disabled:opacity-40"
            >
                Back
            </button>
            <span className="text-gray-600">Page</span>
            <input
                type="number"
                min={ 1 }
                max={ totalPages }
                step={1}
                value={activePage}
                onChange={(e) => {
                    const numValue = Number(e.target.value);
                    if (!isNaN(numValue) && numValue >= 1 && numValue <= totalPages) {
                        onPageChange(numValue);
                    }
                }}
                className="w-12 px-1 py-0.5 border rounded text-center text-xs"
            />
            <span>of {totalPages}</span>
            <button
                disabled={isLast}
                onClick={ () => { onPageChange(Math.min(totalPages, activePage + 1)); } }
                className="px-2 py-1 hover:underline disabled:opacity-40"
            >
                Next
            </button>
        </div>
    );
};

export default Paginator;