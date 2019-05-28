import { TestBed } from '@angular/core/testing';

import { ZeroXService } from './zero-x.service';

describe('ZeroXService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ZeroXService = TestBed.get(ZeroXService);
    expect(service).toBeTruthy();
  });
});
