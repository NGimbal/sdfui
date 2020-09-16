import m from "mithril";
import { ControlGroup, Button, Icons, Icon, Input, Select, Spinner, CustomSelect } from 'construct-ui';
// import '../../node_modules/construct-ui/lib/index.css';

function FloatingMenu() {
  return {
    view: () => (
      <div style="padding:14px;
                    margin:auto;
                    display:flex;
                    flex-direction:row;">
        <ControlGroup style="margin-left:auto;
                              margin-right:auto;"> 
          {/* it is possible to mix mithril syntax m() */}
          <Input contentLeft={<Icon name={Icons.SEARCH}/>}
                  placeholder={"Input placeholder..."}
                  style="width:200px"/>
          <Button iconLeft={Icons.FILTER}
                size={"x0"}/>
          <Button iconLeft={Icons.FILTER}
                size={"x0"}/>
          <Select options={["Polyline", "Polygon", "Circle", "Rectangle"]}/>
        </ControlGroup>
      </div>
    )
  }
}

export default FloatingMenu;