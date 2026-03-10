import { Router } from 'express';
import * as ctrl from './feedback.controller.js';

export const feedbackRouter = Router();

feedbackRouter.get('/', ctrl.list);
feedbackRouter.post('/', ctrl.create);
feedbackRouter.post('/:id/vote', ctrl.vote);
