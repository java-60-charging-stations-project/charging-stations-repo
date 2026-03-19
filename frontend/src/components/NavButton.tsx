import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import SimpleButton from "./SimpleButton";
import type { SimpleButtonProps } from "./SimpleButton";

interface NavButtonProps extends Omit<SimpleButtonProps, "handleClick" | "buttonType"> {
    to: string;
}

const NavButton: FC<NavButtonProps> = ({ to, ...rest }) => {
    const navigate = useNavigate();
    return (
        <SimpleButton
            handleClick={() => navigate(to)}
            underlineOnHover
            {...rest}
        />
    );
}

export default NavButton;
