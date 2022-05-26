import type { IStudentService } from '.';

export class StudentService implements IStudentService {

  public splitUsername(username: string): [ string | null, number | null ] {
    const [ courseCode ] = username.split(/\d/u, 1); // get the leading non-digit characters
    if (courseCode.length === 0) {
      return [ null, null ];
    }
    const studentNumber = parseInt(username.substring(courseCode.length), 10); // parse the remaining characters as an int
    if (isNaN(studentNumber)) {
      return [ courseCode, null ];
    }
    return [ courseCode, studentNumber ];
  }
}
