import { type FC } from "react";

interface PaginatorProps {
    totalPages: number;
    activePage: number;
    onPageChange: (page: number) => void;
};

const Paginator: FC<PaginatorProps> = ({totalPages, activePage, onPageChange}) => {
    const isFirst = (activePage == 1);
    const isLast = (activePage == totalPages);
    return (
        <div className="flex">
            <button
                disabled={isFirst}
                onClick={ () => { onPageChange(Math.max(1, activePage - 1));  } }
                className="h-20 w-10 hover:underline"
            >
                Back
            </button>
            <span>Page</span>
            <input
                type="number"
                min={ 1 }
                max={ totalPages }
                step={1}
                value={activePage}
                onChange={(value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue >= 1 && numValue <= totalPages) {
                        onPageChange(Number(value));
                    }
                }}
                className="h-50"
            />
            <span>of {totalPages}</span>
            <button
                disabled={isLast}
                onClick={ () => { onPageChange(Math.min(totalPages, activePage + 1)); } }
                className="h-20 w-10 hover:underline"
            >
                Next
            </button>
        </div>
    );
};

export default Paginator;