import type { ReactNode, FC } from "react";

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    showCloseButton: boolean;
    /** Tailwind max-width class for the panel, e.g. "max-w-sm" (default) or "max-w-3xl". */
    panelClassName?: string;
};

const Modal: FC<ModalProps> = ({ isOpen, onClose, showCloseButton, title, children, panelClassName }) => {
    if (!isOpen) return null;

    const panelMax = panelClassName ?? "max-w-sm";

    return (
        <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div 
                className={`bg-white p-6 rounded-lg shadow-xl z-10 w-full mx-auto ${panelMax}`}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold">{title}</h2>
                    </div>
                )}
                {children}
                { showCloseButton && (
                    <div className="mt-4 flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 bg-red-500 text-white rounded">
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;