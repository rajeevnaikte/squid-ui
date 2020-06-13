import { GenesisViewModel, ViewModel } from '../ViewModel';
import { html as prettyHtml } from 'js-beautify';
import { readFile } from 'squid-node-utils';
import { UI, UX } from '../..';
import { Component } from '../Component';
import { ViewState } from '../ViewState';
import { Config } from '../../configurations/configuration';

describe('ViewModel', () => {
  test('GenesisViewModel', async () => {
    const genesis = new GenesisViewModel(document.body);
    genesis.add({
      ux: 'form-field-valid'
    });

    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/valid.ux`) ?? ''));

    // @ts-ignore
    const uxViewModel = genesis.items[0];
    expect(uxViewModel).toBeDefined();
    // @ts-ignore
    expect(uxViewModel._id).toEqual('ux-0');
    // @ts-ignore
    expect(uxViewModel.state).toEqual({});
  });

  test('with state data', () => {
    const genesis = new GenesisViewModel(document.body);
    genesis.add({
      ux: 'form-field-valid',
      exampleInputEmail1: 'my-email',
      exampleInputEmail2: 1234
    });

    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/with-state.ux`) ?? ''));

    // @ts-ignore
    const uxViewModel = genesis.items[0];
    // @ts-ignore
    expect(uxViewModel.state).toEqual({
      exampleInputEmail1: 'my-email',
      exampleInputEmail2: 1234
    });
  });

  test('state update', () => {
    const genesis = new GenesisViewModel(document.body);
    genesis.add({
      ux: 'form-field-valid',
      exampleInputEmail1: 'my-email',
      exampleInputEmail2: 1234
    });

    // @ts-ignore
    const uxViewModel = genesis.items[0];
    // @ts-ignore
    uxViewModel.state.exampleInputEmail2 = 12345;
    // @ts-ignore
    expect(uxViewModel.state.exampleInputEmail2).toEqual(12345);
    expect(document.body.getElementsByTagName('input')[0].getAttribute('id'))
      .toEqual('12345');
  });

  test('with two items', async () => {
    const genesis = new GenesisViewModel(document.body);
    genesis.add({
      ux: 'form-form',
      items: [{
        ux: 'form-text-input'
      }, {
        ux: 'form-text-input'
      }]
    });

    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/add-two-item.ux`)));
  });

  test('add and remove item', () => {
    const genesis = new GenesisViewModel(document.body);
    const form = new ViewModel({
      ux: 'form-form'
    });
    genesis.add(form);

    // Add an item.
    form.addItem({
      ux: 'form.text-input'
    });
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/add-one-item.ux`)));

    // Add another item.
    form.addItem({
      ux: 'form.text-input'
    });
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/add-two-item.ux`)));

    // Remove an item.
    const removed = form.removeItem(0);
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/after-detach.ux`)));
    expect(removed?.attachedTo).toEqual(undefined);

    // Add the removed item back at same position.
    if (removed) form.addItem(removed, 0);
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/add-two-item.ux`)));
    expect(removed?.attachedTo).toEqual(form);

    // Move an item to different place.
    if (removed) genesis.add(removed);
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/re-attached.ux`)));
    expect(removed?.attachedTo).toEqual(undefined);
  });

  test('detach and attachTo', () => {
    const genesis = new GenesisViewModel(document.body);
    genesis.add({
      ux: 'form-form',
      items: [{
        ux: 'form-text-input'
      }, {
        ux: 'form-text-input'
      }]
    });

    // @ts-ignore
    const detachedViewModel = genesis.items[0].items[0].detach();
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/after-detach.ux`)));

    // Re-attach in different place.
    genesis.add(detachedViewModel);
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/re-attached.ux`)));

    // Re-attach to original position.
    // @ts-ignore
    detachedViewModel.attachTo(genesis.items[0], 0);
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/add-two-item.ux`)));
  });

  test('listeners', () => {
    const eventLogs: string[] = [];

    const genesis = new GenesisViewModel(document.body);
    const form = genesis.add({
      ux: 'form-form',
      items: [{
        ux: 'form-text-input'
      }, {
        ux: 'form-submit-button',
        listeners: {
          click: (vm: ViewModel, event: Event) => {
            eventLogs.push(`${vm.id} ${event.type}`);
          }
        }
      }]
    });

    document.body.getElementsByTagName('button')[0].click();

    // Update listener.
    form.items[1].listeners.click = (vm: ViewModel, event: Event) => {
      eventLogs.push(`${event.type} ${vm.id}`);
    };
    document.body.getElementsByTagName('button')[0].click();

    // Add new listener.
    form.items[0].listeners.click = (vm: ViewModel, event: Event) => {
      eventLogs.push(`${event.type} ${vm.id}`);
    };
    document.body.getElementsByTagName('input')[0].click();

    expect(eventLogs).toEqual(['ux-2 click', 'click ux-2', 'click ux-1']);
  });

  describe('component', () => {
    const eventLogs: string[] = [];

    UX.define('panel.grid', class extends Component {
      buildViewState (viewState: ViewState): ViewState[] {
        return [{
          ux: 'panel.grid.header-row',
          items: viewState.headers.map((header: any) => {
            return {
              ux: 'panel.grid.header',
              label: header.label
            };
          })
        }];
      }

      onStateUpdate (key: string, prevValue: any, newValue: any) {
        if (key === 'header') {
          throw 'Header update not allowed. Please call \'addHeader()\' method.';
        }
      }

      addHeader (id: string, label: string) {
        this.vm.items[0].addItem({
          ux: 'panel.grid.header',
          label: label
        });
      }
    });

    const renderGrid = () => {
      const app: ViewState = {
        ux: 'panel.grid',
        headers: [{
          id: 'name',
          label: 'Name'
        }, {
          id: 'profession',
          label: 'Profession'
        }],
        data: [{
          name: 'Chaglar',
          profession: 'Cafe owner'
        }, {
          name: 'Jessie',
          profession: 'Cook'
        }],
        listeners: {
          click: (vm, e) => {
            eventLogs.push(vm.ux);
          }
        }
      };

      const appView = UI.render(app);
      const gridCom = appView.items[0].comp;

      return gridCom;
    };

    test('custom method', () => {
      renderGrid().addHeader('education', 'Education');

      expect(prettyHtml(document.body.innerHTML))
        .toEqual(prettyHtml(readFile(`${__dirname}/expected/grid-component.ux`)));
    });

    test('listener', () => {
      renderGrid();
      Array.from(document.getElementsByTagName('span'))
        .find(el => el.getAttribute(Config.UX_NAME_ATTRIB) === 'panel-grid-header')
        ?.getElementsByTagName('span')[0].click();
      expect(eventLogs).toEqual(['panel.grid']);
    });

    test('state update', () => {
      expect(() => renderGrid().vm.state.header = [])
        .toThrow('Header update not allowed. Please call \'addHeader()\' method.');
    });
  });

  test('up and down', () => {
    const genesis = new GenesisViewModel(document.body);
    genesis.add({
      ux: 'form-form',
      items: [
        {
          ux: 'panel-my-panel',
          items: [{
            ux: 'form.text-input'
          }, {
            ux: 'form-text-input'
          }]
        }
      ]
    });

    const textInputs = genesis.items[0].down('form-text-input');
    expect(textInputs?.length).toEqual(2);
    expect(textInputs?.[0].up('form.form')).toBeDefined();
    expect(textInputs?.[0].up('form_form')).toBeDefined();
  });

  test('add remove while other elements in sibling', () => {
    const genesis = new GenesisViewModel(document.body);
    const form = new ViewModel({
      ux: 'form.form-panel',
      title: 'my form',
      footer: 'thank you'
    });
    genesis.add(form);

    // Add an item.
    form.addItem({
      ux: 'form.text-input'
    });
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/add-one-item.ux`)));

    // Add an item.
    form.addItem({
      ux: 'form.text-input'
    });
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/add-two-item.ux`)));

    // Add an item.
    form.addItem({
      ux: 'form.text-input'
    });
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/add-three-item.ux`)));

    const removed = form.removeItem(1) as ViewModel;
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/remove-mid-item.ux`)));

    form.addItem(removed, 0);
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/re-attach-at-first-position.ux`)));

    form.addItem(removed, 5);
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/re-attach-at-non-existing-position.ux`)));

    form.addItem(removed, 2);
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/re-attach-at-non-existing-position.ux`)));

    form.addItem(removed, 3);
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/re-attach-at-non-existing-position.ux`)));
  });

  test('add cssClass', () => {
    const genesis = new GenesisViewModel(document.body);
    genesis.add({
      ux: 'form-form',
      cssClass: 'test'
    });
    expect(prettyHtml(document.body.innerHTML))
      .toEqual(prettyHtml(readFile(`${__dirname}/expected/add-css-class.ux`)));
  });
});
