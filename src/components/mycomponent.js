import m from "mithril";
import { Button, Icons } from 'construct-ui';
// import '../../node_modules/construct-ui/lib/index.css';

function MyComponent() {
  return {
    view: () => (
      <main>
        <div id="canvasContainer">
          <canvas id="c"></canvas>
          <canvas id="text"></canvas>
        </div>
        <Button iconLeft={Icons.FILTER}
                label={"Button"}
                size={"x1"} />
      </main>
    )
  }
}

export default MyComponent;