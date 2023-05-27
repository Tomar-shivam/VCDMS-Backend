import { Router } from 'express';

export abstract class BaseRoutes {

  constructor() { }
  protected router = Router();

  get routerinstance(): Router {
      return this.router;
  }
}