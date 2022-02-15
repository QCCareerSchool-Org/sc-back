export interface IStudentService {

  /**
   * Converts a student username into a separate course code and student number
   *
   * @param username the username
   * @returns a tuple of course code and student number
   */
  splitUsername: (username: string) => [ string | null, number | null ];
}
