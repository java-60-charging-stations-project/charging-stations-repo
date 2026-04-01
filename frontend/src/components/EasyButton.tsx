import type { ComponentPropsWithoutRef, FC } from "react";

type CustomEasyButtonProps = {
    pH?: number;
    pW?: number;
}

type EasyButtonProps = CustomEasyButtonProps & ComponentPropsWithoutRef<"button">;

const EasyButton: FC<EasyButtonProps> = ({ children, pH: pHeight, pW: pWidth, ...rest }) => {
    const hClass = pHeight ? `h-${pHeight} `: "";
    const wClass = pWidth ? `w-${pWidth} ` : "";
    return (
        <button
            {...rest}
            type="button"
            className={
                `${hClass}${wClass}rounded-md px-2.5 py-0.5 text-sm font-medium no-underline bg-slate-50 text-slate-800 hover:bg-slate-300 hover:text-black`
            }
        >
            {children}
        </button>
    );
};

export default EasyButton;