import m from "mithril";
import { Button, Icon, Icons } from 'construct-ui';

function ConstructSlider() {
  return {
    view: () => (
      <div>
        {/* <Icon name={Icons.EDIT_3}/> */}
        <input type="range"/>
      </div>
    )
  }
}

export default ConstructSlider;