export type CertificateDTO = {
  firstName: string;
  lastName: string;
  graduationDate: Date;
  courseName: string;
  schoolName: string;
  designation: {
    name: string;
    code: string;
  };
};
