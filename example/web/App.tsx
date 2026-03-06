import {Component, createResource} from 'solid-js';
import { Greeting } from "App.go"
import { Test } from "Test.go";

const App: Component = () => {
  const [greeting] = createResource(() => Greeting("foo"))
  const [test] = createResource(() => Test())
  return (
    <pre class="text-4xl bg-black h-dvh overflow-y-auto text-green-700 text-center py-20">{greeting()?.Message} {test()}</pre>
  );
};

export default App;
