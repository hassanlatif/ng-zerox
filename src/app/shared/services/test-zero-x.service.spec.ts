import { TestBed } from '@angular/core/testing';

import { TestZeroXService } from './test-zero-x.service';

describe('TestZeroXService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TestZeroXService = TestBed.get(TestZeroXService);
    expect(service).toBeTruthy();
  });
});
