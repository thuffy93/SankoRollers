interface CourseLayout {
  [key: string]: any;
}

class Course {
  layout: CourseLayout;

  constructor(layout: CourseLayout) {
    this.layout = layout;
  }
}

export default Course; 