import {Component, createResource} from 'solid-js';
import { Greeting } from "App.go"

const App: Component = () => {
  const [greeting] = createResource(() => Greeting("foo"))
  return (
    <pre class="text-4xl bg-black h-dvh overflow-y-auto text-green-700 text-center py-20">{greeting()?.message}</pre>
  );
};

export default App;
