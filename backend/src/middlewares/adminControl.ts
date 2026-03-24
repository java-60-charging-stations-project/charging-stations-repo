import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../common/serviceErrors";

export const modifySelfControl = (req: Request, _res: Response, next: NextFunction) => {
    const { userId } = req.params;
    const adminId = req.user?.sub;

    if (!!userId && !!adminId && userId == adminId) {
        return next(new BadRequestError("Cannot modify self"));
    }
    
    next();
};