interface GLState {
  stencilTest?: boolean;
  depthTest?: boolean;
  faceCulling?: boolean;
  cullFace?: number;
  stencilOp?: [number, number, number];
  stencilFunc?: [number, number, number];
  stencilMask?: number;
  depthFunc?: number;
  depthMask?: boolean;
  colorMask?: [boolean, boolean, boolean, boolean];
}

const GL = WebGLRenderingContext;

const defaultGLState: GLState = {
  stencilTest: false,
  depthTest: true,
  faceCulling: true,
  cullFace: GL.BACK,
  stencilOp: [GL.KEEP, GL.KEEP, GL.KEEP],
  stencilMask: 0x00,
  stencilFunc: [GL.ALWAYS, 0x00, 0x00],
  depthFunc: GL.LESS,
  depthMask: true,
  colorMask: [true, true, true, true]
};

Object.freeze(defaultGLState);

const isPropEqual = (state: GLState, pname: string, value: any) => {
  const defaultValue = defaultGLState[pname];
  const oldValue = state[pname];

  if (defaultValue === undefined) {
    throw new Error(`Invalid state prop ${pname}`);
  }

  if (oldValue === undefined || value === undefined) {
    throw new Error(`Invalid state prop ${pname}`);
  }

  if (oldValue === value) {
    return true;
  }

  if (
    Array.isArray(defaultValue) &&
    Array.isArray(value) &&
    Array.isArray(oldValue)
  ) {
    return oldValue.every((v, i) => v === value[i]);
  }

  return false;
};

const setStateProp = (state: GLState, pname: string, value: any) => {
  const defaultValue = defaultGLState[pname];
  if (defaultValue === undefined) {
    return state;
  }

  if (Array.isArray(defaultValue)) {
    if (!Array.isArray(value)) {
      return state;
    }

    return {
      ...state,
      [pname]: [...value]
    };
  }

  return {
    ...state,
    [pname]: value
  };
};

const glPropSetters = {
  stencilTest: (gl: WebGLRenderingContext, value: boolean) =>
    value ? gl.enable(gl.STENCIL_TEST) : gl.disable(gl.STENCIL_TEST),

  depthTest: (gl: WebGLRenderingContext, value: boolean) =>
    value ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST),

  faceCulling: (gl: WebGLRenderingContext, value: boolean) =>
    value ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE),

  cullFace: (gl: WebGLRenderingContext, value: number) => gl.cullFace(value),
  stencilOp: (gl: WebGLRenderingContext, value: [number, number, number]) =>
    gl.stencilOp(value[0], value[1], value[2]),
  stencilMask: (gl: WebGLRenderingContext, value: number) =>
    gl.stencilMask(value),
  stencilFunc: (gl: WebGLRenderingContext, value: [number, number, number]) =>
    gl.stencilFunc(value[0], value[1], value[2]),
  depthFunc: (gl: WebGLRenderingContext, value: number) => gl.depthFunc(value),
  depthMask: (gl: WebGLRenderingContext, value: boolean) => gl.depthMask(value),
  colorMask: (
    gl: WebGLRenderingContext,
    value: [boolean, boolean, boolean, boolean]
  ) => gl.colorMask(value[0], value[1], value[2], value[3])
};

const setProp = (
  gl: WebGLRenderingContext,
  state: GLState,
  pname: string,
  value: any
) => {
  if (isPropEqual(state, pname, value)) {
    return state;
  }

  const newState = setStateProp(state, pname, value);
  glPropSetters[pname](gl, value);

  return newState;
};

const glApplyState = (gl: WebGLRenderingContext, state: GLState) => {
  Object.keys(defaultGLState).forEach(pname => {
    const value = state[pname] || defaultGLState[pname];
    glPropSetters[pname](gl, value);
  });
};

export class State {
  private gl: WebGLRenderingContext;
  private state: GLState;
  private stack: GLState[];

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.state = defaultGLState;
    this.stack = [];

    glApplyState(gl, this.state);
  }

  apply() {
    glApplyState(this.gl, this.state);
  }

  set(props: GLState) {
    let newState = this.state;
    Object.keys(props).forEach(pname => {
      const value = props[pname];
      newState = setProp(this.gl, newState, pname, value);
    });

    this.state = newState;
  }

  setProp(pname: string, value: any) {
    this.set({ [pname]: value });
  }

  push() {
    this.stack.push({ ...this.state });
  }

  pop() {
    const state = this.stack.pop();
    this.set(state);
  }

  reset() {
    this.set(defaultGLState);
  }
}
