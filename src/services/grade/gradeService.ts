import type { Grade, GradeScheme, IGradeService } from './index.js';

export class GradeService implements IGradeService {

  public calculate(percentage: number, scheme: GradeScheme = '2014'): Grade {
    return scheme === '2014' ? this.calculate2014(percentage) : this.calculateOld(percentage);
  }

  private calculate2014(percentage: number): Grade {
    if (percentage >= 0.95) {
      return 'A+';
    } else if (percentage >= 0.90) {
      return 'A';
    } else if (percentage >= 0.85) {
      return 'A-';
    } else if (percentage >= 0.80) {
      return 'B+';
    } else if (percentage >= 0.75) {
      return 'B';
    } else if (percentage >= 0.70) {
      return 'B-';
    } else if (percentage >= 0.65) {
      return 'C+';
    } else if (percentage >= 0.60) {
      return 'C';
    } else if (percentage >= 0.50) {
      return 'C-';
    }
    return 'F';
  }

  private calculateOld(percentage: number): Grade {
    if (percentage >= 0.95) {
      return 'A+';
    } else if (percentage >= 0.90) {
      return 'A';
    } else if (percentage >= 0.85) {
      return 'A-';
    } else if (percentage >= 0.80) {
      return 'B+';
    } else if (percentage >= 0.75) {
      return 'B';
    } else if (percentage >= 0.70) {
      return 'B-';
    } else if (percentage >= 0.65) {
      return 'C+';
    } else if (percentage > 0) {
      return 'C';
    }
    return 'F';
  }
}
