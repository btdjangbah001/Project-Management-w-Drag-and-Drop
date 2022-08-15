enum ProjectStatus {
  Active,
  Finished,
}

interface Draggable {
  dragStartHandler(event: DragEvent): void;
  dragEndHandler(event: DragEvent): void;
}

interface DragTarget {
  dragOverHandler(event: DragEvent): void;
  dropHandler(event: DragEvent): void;
  dragLeaveHandler(event: DragEvent): void;
}

class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public people: number,
    public status: ProjectStatus
  ) {}
}

type Listener<T> = (items: T[]) => void;

class State<T> {
  protected listeners: Listener<T>[] = [];

  addListener(listenerFn: Listener<T>) {
    this.listeners.push(listenerFn);
  }
}

class ProjectState extends State<Project> {
  private projects: Project[] = [];
  private static instance: ProjectState;

  private constructor() {
    super();
  }

  static getInstance() {
    if (this.instance) {
      return this.instance;
    } else {
      this.instance = new ProjectState();
      return this.instance;
    }
  }

  addProjects(title: string, description: string, people: number) {
    const newProject = new Project(
      Math.random().toString(),
      title,
      description,
      people,
      ProjectStatus.Active
    );
    this.projects.push(newProject);
    this.updateListeners();
  }

  moveProject(projectId: string, newStatus: ProjectStatus) {
    const project = this.projects.find((el) => el.id === projectId);
    if (project && project.status !== newStatus) {
      project.status = newStatus;
      this.updateListeners();
    }
  }

  private updateListeners() {
    for (const listenerFn of this.listeners) {
      listenerFn(this.projects.slice());
    }
  }
}

const projectState = ProjectState.getInstance();

interface Validatable {
  value: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

function validator(arg: Validatable) {
  let isValid = true;
  if (arg.required) {
    isValid = isValid && arg.value.toString().trim().length !== 0;
  }
  if (arg.minLength != null && typeof arg.value === "string") {
    isValid = isValid && arg.value.length >= arg.minLength;
  }
  if (arg.maxLength != null && typeof arg.value === "string") {
    isValid = isValid && arg.value.length <= arg.maxLength;
  }
  if (arg.min != null && typeof arg.value === "number") {
    isValid = isValid && arg.value >= arg.min;
  }
  if (arg.max != null && typeof arg.value === "number") {
    isValid = isValid && arg.value <= arg.max;
  }
  return isValid;
}

function Autobind(_: any, _1: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const adjDescriptor: PropertyDescriptor = {
    configurable: true,
    enumerable: false,
    get() {
      const bindFn = originalMethod.bind(this);
      return bindFn;
    },
  };
  return adjDescriptor;
}

abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateElement: HTMLTemplateElement;
  hostElement: T;
  element: U;

  constructor(
    templateId: string,
    hostId: string,
    insertAtStart: boolean,
    newElementId?: string
  ) {
    this.templateElement = document.getElementById(
      templateId
    )! as HTMLTemplateElement;
    this.hostElement = document.getElementById(hostId)! as T;
    const importedNode = document.importNode(
      this.templateElement.content,
      true
    );

    this.element = importedNode.firstElementChild! as U;
    if (newElementId) {
      this.element.id = newElementId;
    }

    this.attach(insertAtStart);
  }

  private attach(insertAtBeginning: boolean) {
    this.hostElement.insertAdjacentElement(
      insertAtBeginning ? "afterbegin" : "beforeend",
      this.element
    );
  }

  abstract configure(): void;
  abstract renderContent(): void;
}

class ProjectList
  extends Component<HTMLDivElement, HTMLElement>
  implements DragTarget
{
  assignedProjects: Project[];

  constructor(private type: "active" | "finished") {
    super("project-list", "app", false, `${type}-projects`);

    this.assignedProjects = [];
    this.configure();
    this.renderContent();
  }

  private renderProjects() {
    const listElement = document.getElementById(
      `${this.type}-projects-list`
    )! as HTMLUListElement;

    listElement.textContent = "";

    for (const project of this.assignedProjects) {
      new ProjectItem(this.element.querySelector("ul")!.id, project);
    }
  }
  @Autobind
  dragOverHandler(event: DragEvent): void {
    if (event.dataTransfer && event.dataTransfer.types[0] === "text/plain") {
      event.preventDefault();
      this.element.querySelector("ul")!.classList.add("droppable");
    }
  }
  @Autobind
  dragLeaveHandler(_: DragEvent): void {
    this.element.querySelector("ul")!.classList.remove("droppable");
  }
  @Autobind
  dropHandler(event: DragEvent): void {
    const projectId = event.dataTransfer!.getData("text/plain");
    projectState.moveProject(
      projectId,
      this.type === "active" ? ProjectStatus.Active : ProjectStatus.Finished
    );
  }

  configure(): void {
    this.element.addEventListener("dragover", this.dragOverHandler);
    this.element.addEventListener("dragleave", this.dragLeaveHandler);
    this.element.addEventListener("drop", this.dropHandler);

    projectState.addListener((projects: Project[]) => {
      const relevantProjects = projects.filter((proj) => {
        if (this.type === "active") return proj.status === ProjectStatus.Active;
        return proj.status === ProjectStatus.Finished;
      });
      this.assignedProjects = relevantProjects;
      this.renderProjects();
    });
  }

  renderContent() {
    this.element.querySelector("h2")!.textContent =
      `${this.type} Projects`.toUpperCase();
    this.element.querySelector("ul")!.id = `${this.type}-projects-list`;
  }
}

class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  titleElement: HTMLInputElement;
  descriptionElement: HTMLInputElement;
  peopleElement: HTMLInputElement;

  constructor() {
    super("project-input", "app", true, "user-input");

    this.titleElement = this.element.querySelector(
      "#title"
    ) as HTMLInputElement;

    this.descriptionElement = this.element.querySelector(
      "#description"
    ) as HTMLInputElement;

    this.peopleElement = this.element.querySelector(
      "#people"
    ) as HTMLInputElement;

    this.configure();
  }
  configure() {
    this.element.addEventListener("submit", this.handleSubmit);
  }

  renderContent(): void {
    throw new Error("Method not implemented.");
  }

  private gatherUserInput(): [string, string, number] | void {
    const title = this.titleElement.value;
    const description = this.descriptionElement.value;
    const people = this.peopleElement.value;

    if (
      !validator({ value: title, required: true }) ||
      !validator({ value: description, required: true, minLength: 5 }) ||
      !validator({ value: +people, required: true, min: 0, max: 5 })
    ) {
      return alert("Invalid input!");
    } else {
      return [title, description, +people];
    }
  }

  private clearInputs() {
    this.titleElement.value = "";
    this.descriptionElement.value = "";
    this.peopleElement.value = "";
  }

  @Autobind
  private handleSubmit(event: Event) {
    event.preventDefault();
    const userInput = this.gatherUserInput();
    if (Array.isArray(userInput)) {
      const [title, description, people] = userInput;
      projectState.addProjects(title, description, people);
      this.clearInputs();
    }
  }
}

class ProjectItem
  extends Component<HTMLUListElement, HTMLLIElement>
  implements Draggable
{
  private project: Project;

  get persons() {
    if (this.project.people === 1) return "1 person assigned";
    else return `${this.project.people} persons assigned`;
  }
  constructor(hostId: string, project: Project) {
    super("single-project", hostId, false, project.id);

    this.project = project;

    this.configure();
    this.renderContent();
  }
  @Autobind
  dragStartHandler(event: DragEvent): void {
    event.dataTransfer!.setData("text/plain", this.project.id);
    event.dataTransfer!.effectAllowed = "move";
  }

  @Autobind
  dragEndHandler(event: DragEvent): void {
    console.log(event);
  }

  configure(): void {
    this.element.addEventListener("dragstart", this.dragStartHandler);

    this.element.addEventListener("dragend", this.dragEndHandler);
  }

  renderContent(): void {
    this.element.querySelector("h2")!.textContent = this.project.title;
    this.element.querySelector("h3")!.textContent = this.persons;
    this.element.querySelector("p")!.textContent = this.project.description;
  }
}

const projInput = new ProjectInput();
const activeProjectList = new ProjectList("active");
const finishedProjectList = new ProjectList("finished");
