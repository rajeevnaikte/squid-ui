import { GenesisViewModel, ViewModel } from '../ViewModel';
import { html as prettyHtml } from 'js-beautify';
import { readFile } from 'squid-node-utils';
import { UI, UX } from '../..';
import { Component } from '../Component';
import { ViewState } from '../ViewState';
import { Config } from '../../configurations/configuration';
import { MultipleItemsRefs } from '../../exceptions/errors';

describe('ViewModel', () =>
{
	test('GenesisViewModel', async () =>
	{
		const app = {
			ux: 'form-field-valid'
		};
		const genesis = new GenesisViewModel(app, document.body);

		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/valid.ux`) ?? ''));

		const uxViewModel = genesis;
		expect(uxViewModel).toBeDefined();
		expect(uxViewModel.id).toEqual('ux-0');
		expect(uxViewModel.state).toEqual({});
	});

	test('with state data', () =>
	{
		const app = {
			ux:    'form-field-valid',
			state: {
				exampleInputEmail1: 'my-email',
				exampleInputEmail2: 1234
			},
		};
		const genesis = new GenesisViewModel(app, document.body);

		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/with-state.ux`) ?? ''));

		const uxViewModel = genesis;
		expect(uxViewModel.state).toEqual({
			exampleInputEmail1: 'my-email',
			exampleInputEmail2: 1234
		});
	});

	test('state update', () =>
	{
		const app = {
			ux:    'form-field-valid',
			state: {
				exampleInputEmail1: 'my-email',
				exampleInputEmail2: 1234
			},
		};
		const genesis = new GenesisViewModel(app, document.body);

		const uxViewModel = genesis;
		uxViewModel.state.exampleInputEmail2 = 12345;
		expect(uxViewModel.state.exampleInputEmail2).toEqual(12345);
		expect(document.body.getElementsByTagName('input')[0].getAttribute('id'))
			.toEqual('12345');
	});

	test('with two items', async () =>
	{
		const app = {
			ux:    'form-form',
			items: [{
				ux: 'form-text-input'
			}, {
				ux: 'form-text-input'
			}]
		};
		const genesis = new GenesisViewModel(app, document.body);

		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/add-two-item.ux`)));
	});

	test('add and remove item', () =>
	{
		const form = new GenesisViewModel({
			ux: 'form-form'
		}, document.body);

		// Add an item.
		form.addItem({
			ux: 'form.text-input'
		});
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/add-one-item.ux`)));

		// Add another item.
		form.addItem({
			ux: 'form.text-input'
		});
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/add-two-item.ux`)));

		// Remove an item.
		const removed = form.removeItem(0);
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/after-detach.ux`)));
		expect(removed?.attachedTo).toEqual(undefined);

		// Add the removed item back at same position.
		if (removed) form.addItem(removed, { position: 0 });
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/re-add-at-same-position.ux`)));
		expect(removed?.attachedTo).toEqual(form);

		// Move an item to different place.
		if (removed) form.addItem(removed);
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/re-attached.ux`)));
		expect(removed?.attachedTo).toEqual(undefined);
	});

	test('detach and attachTo', () =>
	{
		const form = {
			ux:    'form-form',
			items: [{
				ux: 'form-text-input'
			}, {
				ux: 'form-text-input'
			}]
		};
		const genesis = new GenesisViewModel(form, document.body);

		const detachedViewModel = genesis.items[0].detach();
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/after-detach.ux`)));

		// Re-attach in different place.
		genesis.addItem(detachedViewModel);
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/re-attached.ux`)));

		// Re-attach to original position.
		detachedViewModel.attachTo(genesis, { position: 0 });
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/re-add-at-same-position.ux`)));
	});

	test('listeners', () =>
	{
		const eventLogs: string[] = [];

		const form = new GenesisViewModel({
			ux:    'form-form',
			items: [{
				ux: 'form-text-input'
			}, {
				ux:        'form-submit-button',
				listeners: {
					click: (vm: ViewModel, event: Event) =>
					{
						eventLogs.push(`${vm.id} ${event.type}`);
					}
				}
			}]
		}, document.body);

		document.body.getElementsByTagName('button')[0].click();

		// Update listener.
		form.items[1].listeners.click = (vm: ViewModel, event: Event) =>
		{
			eventLogs.push(`${event.type} ${vm.id}`);
		};
		document.body.getElementsByTagName('button')[0].click();

		// Add new listener.
		form.items[0].listeners.click = (vm: ViewModel, event: Event) =>
		{
			eventLogs.push(`${event.type} ${vm.id}`);
		};
		document.body.getElementsByTagName('input')[0].click();

		expect(eventLogs).toEqual(['ux-2 click', 'click ux-2', 'click ux-1']);
	});

	describe('component', () =>
	{
		const eventLogs: string[] = [];

		UX.define('panel.grid', class extends Component
		{
			buildViewState (viewState: ViewState & {
				state: {
					headers: { id: string; label: string; }[];
				};
			}): ViewState[]
			{
				eventLogs.push('buildViewState called');

				return [{
					ux:    'panel.grid.header-row',
					items: viewState.state.headers.map((header: any) =>
					{
						return {
							ux:    'panel.grid.header',
							state: {
								label: header.label
							}
						};
					})
				}];
			}

			onComponentReady ()
			{
				eventLogs.push('onComponentReady called');
			}

			onStateUpdate (key: string, prevValue: any, newValue: any)
			{
				if (key === 'header')
				{
					throw 'Header update not allowed. Please call \'addHeader()\' method.';
				}
			}

			addHeader (id: string, label: string)
			{
				this.vm.items[0].addItem({
					ux:    'panel.grid.header',
					state: {
						label: label
					}
				});
			}
		});

		const renderGrid = () =>
		{
			const app: ViewState = {
				ux:    'panel.grid',
				state: {
					headers: [{
						id:    'name',
						label: 'Name'
					}, {
						id:    'profession',
						label: 'Profession'
					}],
					data: [{
						name:       'Chaglar',
						profession: 'Cafe owner'
					}, {
						name:       'Jessie',
						profession: 'Cook'
					}],
				},
				listeners: {
					click: (vm, e) =>
					{
						eventLogs.push(vm.ux);
					}
				}
			};

			const appView = UI.render(app);
			return appView;
		};

		test('event calls', () =>
		{
			renderGrid();
			expect(eventLogs).toEqual(['buildViewState called', 'onComponentReady called']);
		});

		test('custom method', () =>
		{
			renderGrid().addHeader('education', 'Education');

			expect(prettyHtml(document.documentElement.outerHTML))
				.toEqual(prettyHtml(readFile(`${__dirname}/expected/grid-component.ux`)));
		});

		test('listener', () =>
		{
			renderGrid();

			Array.from(document.getElementsByTagName('span'))
				.find(el => el.getAttribute(Config.UX_NAME_ATTRIB) === 'panel-grid-header')
				?.getElementsByTagName('span')[0].click();
			expect(eventLogs.filter(log => !log.includes('called'))).toEqual(['panel.grid']);
		});

		test('state update', () =>
		{
			expect(() => renderGrid().state.header = [])
				.toThrow('Header update not allowed. Please call \'addHeader()\' method.');
		});
	});

	test('up and down', () =>
	{
		const genesis = new GenesisViewModel({
			ux:    'form-form',
			items: [
				{
					ux:    'panel-my-panel',
					items: [{
						ux: 'form.text-input'
					}, {
						ux: 'form-text-input'
					}]
				}
			]
		}, document.body);

		const textInputs = genesis.items[0].down('form-text-input');
		expect(textInputs?.length).toEqual(2);
		expect(textInputs?.[0].up('form.form')).toBeDefined();
		expect(textInputs?.[0].up('form_form')).toBeDefined();
	});

	test('add remove while other elements in sibling', () =>
	{
		const form = new GenesisViewModel({
			ux:    'form.form-panel',
			state: {
				title:  'my form',
				footer: 'thank you'
			},
		}, document.body);

		// Add an item.
		form.addItem({
			ux: 'form.text-input'
		});
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/add-one-item.ux`)));

		// Add an item.
		form.addItem({
			ux: 'form.text-input'
		});
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/add-two-item.ux`)));

		// Add an item.
		form.addItem({
			ux: 'form.text-input'
		});
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/add-three-item.ux`)));

		const removed = form.removeItem(1) as ViewModel;
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/remove-mid-item.ux`)));

		form.addItem(removed, { position: 0 });
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/re-attach-at-first-position.ux`)));

		form.addItem(removed, { position: 5 });
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/re-attach-at-non-existing-position.ux`)));

		form.addItem(removed, { position: 2 });
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/re-attach-at-non-existing-position.ux`)));

		form.addItem(removed, { position: 3 });
		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/form-panel/re-attach-at-non-existing-position.ux`)));
	});

	test('add cssClass', () =>
	{
		const genesis = new GenesisViewModel({
			ux:       'form-form',
			cssClass: 'test'
		}, document.body);

		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/add-css-class.ux`)));
	});

	test('items for', () =>
	{
		const genesis = new GenesisViewModel({
			ux:    'table',
			items: {
				main: [{
					ux:    'text-box',
					state: { text: 'main 1' }
				}, {
					ux:    'text-box',
					state: { text: 'main 2' }
				}],
				columns: [{
					ux:    'text-box',
					state: { text: 'column 1' }
				}, {
					ux:    'text-box',
					state: { text: 'column 2' }
				}],
				rows: [{
					ux:    'text-box',
					state: { text: 'row 1' }
				}, {
					ux:    'text-box',
					state: { text: 'row 2' }
				}],
				test: [{
					ux:    'text-box',
					state: { text: 'test 1' }
				}, {
					ux:    'text-box',
					state: { text: 'test 2' }
				}]
			}
		}, document.body);

		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/table.ux`)));
	});

	test('multiple ref to same items key', () =>
	{
		expect(() =>
		{
			new GenesisViewModel({
				ux: 'invalid-table'
			}, document.body);
		}).toThrow(new MultipleItemsRefs('invalid-table', 'columns'));
	});

	test('multiple main items tag', () =>
	{
		expect(() =>
		{
			new GenesisViewModel({
				ux: 'invalid-table2'
			}, document.body);
		}).toThrow(new MultipleItemsRefs('invalid-table-2', 'main'));
	});

	test('get items', () =>
	{
		const genesis = new GenesisViewModel({
			ux:    'table',
			items: {
				main: [{
					ux:    'text-box',
					state: { text: 'main 1' }
				}, {
					ux:    'text-box',
					state: { text: 'main 2' }
				}],
				columns: [{
					ux:    'text-box',
					state: { text: 'column 1' }
				}, {
					ux:    'text-box',
					state: { text: 'column 2' }
				}],
				rows: [{
					ux:    'text-box',
					state: { text: 'row 1' }
				}, {
					ux:    'text-box',
					state: { text: 'row 2' }
				}],
				test: [{
					ux:    'text-box',
					state: { text: 'test 1' }
				}, {
					ux:    'text-box',
					state: { text: 'test 2' }
				}]
			}
		}, document.body);

		const table = genesis;
		expect(table.items.map(item => item.ux))
			.toEqual(new Array(8).fill('text-box'));
		expect(table.getItems('columns').map(item => item.state.text))
			.toEqual(['column 1', 'column 2']);
	});

	test('with script', () =>
	{
		const genesis = new GenesisViewModel({
			ux:    'form-form',
			items: [{
				ux: 'with-script'
			}]
		}, document.body);

		document.body.getElementsByTagName('form')[0].click();

		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/with-script.ux`)));
	});


	test('item as viewmodel', () =>
	{
		const withScript = new ViewModel({ ux: 'with-script' });
		const app = {
			ux:    'form-form',
			items: [withScript],
		};
		const genesis = new GenesisViewModel(app, document.body);

		document.body.getElementsByTagName('form')[0].click();

		expect(prettyHtml(document.documentElement.outerHTML))
			.toEqual(prettyHtml(readFile(`${__dirname}/expected/with-script.ux`)));
	});
});
