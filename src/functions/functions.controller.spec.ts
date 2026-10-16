import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FunctionsController } from './functions.controller.js';
import { FunctionsService } from './functions.service.js';

describe('FunctionsController', () => {
  let controller: FunctionsController;

  const functionsService = {
    list: vi.fn(),
    findById: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new FunctionsController(
      functionsService as unknown as FunctionsService,
    );
  });

  it('list encaminha ao FunctionsService', async () => {
    functionsService.list.mockResolvedValue([]);

    await expect(controller.list()).resolves.toEqual([]);
    expect(functionsService.list).toHaveBeenCalledTimes(1);
  });

  it('findById encaminha o id ao FunctionsService', async () => {
    const fn = { id: 7, nome: 'piscar_led' };
    functionsService.findById.mockResolvedValue(fn);

    await expect(controller.findById(7)).resolves.toEqual(fn);
    expect(functionsService.findById).toHaveBeenCalledWith(7);
  });
});
