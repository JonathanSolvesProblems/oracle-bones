// Starts the app and routes on the location hash: #/ (calculate), #/limits and #/proof.
import { render, type Dispatch } from './dom.ts';
import { placeholder, routeOf, shell, type Route } from './views/shell.ts';
import type { Child } from './vnode.ts';

function page(route: Route): Child {
  switch (route) {
    case 'limits': return placeholder('Limits', 'The limits page is not built yet.');
    case 'proof': return placeholder('Proof', 'The proof page is not built yet.');
    default: return placeholder('Calculate', 'The calculator is not built yet.');
  }
}

const root = document.getElementById('app');
if (!root) throw new Error('index.html has no #app element');

const dispatch: Dispatch = () => { draw(); };

function draw(): void {
  render(root!, shell(routeOf(location.hash), page(routeOf(location.hash))), dispatch);
}

window.addEventListener('hashchange', draw);
draw();
