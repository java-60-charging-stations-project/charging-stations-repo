import type { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../common/serviceErrors";

export const requireParam = (paramName: string) =>
    (req: Request, res: Response, next: NextFunction) => {
        const paramValue = req.params[paramName];
        if (!paramValue || paramValue.trim() === "") {
            const error = new BadRequestError(`Parameter ${String(paramName)} is required`);
            return next(error);
        }

        next();
    };


export const requireUserid = requireParam("userId");