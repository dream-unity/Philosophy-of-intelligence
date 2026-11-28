export function createDefaultMap() {
  return {
    version: 1,
    nodes: [
      { id: 'medicine', parentId: null, label: 'Why I choose medicine' },
      { id: 'service', parentId: 'medicine', label: 'Service to others' },
      { id: 'empathy', parentId: 'service', label: 'Altruism and empathy' },
      { id: 'trauma', parentId: 'service', label: 'Understanding trauma' },
      { id: 'learning', parentId: 'medicine', label: 'Lifelong learning' },
      { id: 'reasoning', parentId: 'learning', label: 'Reasoning buildings' },
      { id: 'rehearsal', parentId: 'learning', label: 'Rehearsal and reflection' },
      { id: 'existence', parentId: 'learning', label: 'Existentialism and responsibility' },
      { id: 'feedback', parentId: 'existence', label: 'Feedback loops' },
      { id: 'adapt', parentId: 'feedback', label: 'Adaptability' },
      { id: 'lock', parentId: 'adapt', label: 'Helpful and harmful lock-in' }
    ]
  };
}

function childrenOf(nodes) {
  const groups = new Map();
  for (const node of nodes) {
    if (!groups.has(node.parentId)) groups.set(node.parentId, []);
    groups.get(node.parentId).push(node);
  }
  return groups;
}

function subtreeIds(id, groups) {
  const ids = new Set();
  const pending = [id];
  while (pending.length) {
    const next = pending.pop();
    if (ids.has(next)) continue;
    ids.add(next);
    for (const child of groups.get(next) || []) pending.push(child.id);
  }
  return ids;
}

export function validateMap(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.nodes) || !value.nodes.length) return false;
  const ids = new Set();
  for (const node of value.nodes) {
    if (!node || typeof node.id !== 'string' || !node.id || ids.has(node.id)) return false;
    if (typeof node.label !== 'string' || !node.label.trim()) return false;
    if (node.parentId !== null && typeof node.parentId !== 'string') return false;
    ids.add(node.id);
  }
  const groups = childrenOf(value.nodes);
  const roots = groups.get(null);
  return roots?.length === 1 && subtreeIds(roots[0].id, groups).size === ids.size;
}

function copyMap(value) {
  return { version: 1, nodes: value.nodes.map(({ id, label, parentId }) => ({ id, label, parentId })) };
}

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function button(label, action, className = '') {
  const el = element('button', className, label);
  el.type = 'button';
  el.addEventListener('click', action);
  return el;
}

export function mountMap(root, saved, onChange) {
  const state = copyMap(validateMap(saved) ? saved : createDefaultMap());
  const top = state.nodes.find(node => node.parentId === null);
  let selected = top;
  let groups;
  const nodeButtons = new Map();
  const nodesById = new Map(state.nodes.map(node => [node.id, node]));
  const main = element('div', 'declaration-map');
  const screen = element('div', 'dm-screen');
  screen.setAttribute('role', 'region');
  screen.setAttribute('aria-label', 'Mind map. Select an idea to edit it.');
  const tree = element('ul', 'dm-tree');
  const editor = element('div', 'dm-editor');
  const nameForm = element('form', 'dm-name');
  const label = element('label', 'dm-field');
  label.append(element('span', '', 'Selected idea'));
  const input = element('input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.required = true;
  label.append(input);
  const rename = element('button', '', 'Save name');
  rename.type = 'submit';
  nameForm.append(label, rename);
  const actions = element('div', 'dm-actions');
  const addChild = button('Add branch', () => addNode(selected.id));
  const addSibling = button('Add sibling', () => {
    if (selected.parentId !== null) addNode(selected.parentId);
  });
  const remove = button('Delete branch', confirmRemoval, 'dm-remove');
  actions.append(addChild, addSibling, remove);
  const moveForm = element('form', 'dm-move');
  const moveLabel = element('label', 'dm-field');
  moveLabel.append(element('span', '', 'Move under'));
  const target = element('select');
  moveLabel.append(target);
  const move = element('button', '', 'Move');
  move.type = 'submit';
  moveForm.append(moveLabel, move);
  const confirmation = element('div', 'dm-confirm');
  confirmation.hidden = true;
  const message = element('span');
  const cancel = button('Cancel', () => {
    confirmation.hidden = true;
    remove.focus();
  });
  const confirm = button('Confirm deletion', removeBranch, 'dm-remove');
  confirmation.append(message, cancel, confirm);
  const status = element('div', 'dm-status');
  status.setAttribute('role', 'status');
  editor.append(nameForm, actions, moveForm, confirmation, status);
  screen.append(tree);
  main.append(screen, editor);
  root.replaceChildren(main);

  function changed() {
    if (typeof onChange === 'function') onChange(copyMap(state));
  }

  function populateMove() {
    const excluded = subtreeIds(selected.id, groups);
    const options = [];
    for (const node of state.nodes) {
      if (excluded.has(node.id)) continue;
      const option = element('option', '', node.label);
      option.value = node.id;
      option.selected = node.id === selected.parentId;
      options.push(option);
    }
    target.replaceChildren(...options);
    moveForm.hidden = selected.parentId === null || options.length <= 1;
    move.disabled = target.value === selected.parentId;
  }

  function selectNode(id, focusButton = false) {
    const previous = nodeButtons.get(selected.id);
    if (previous) previous.setAttribute('aria-pressed', 'false');
    selected = nodesById.get(id);
    const active = nodeButtons.get(id);
    active.setAttribute('aria-pressed', 'true');
    input.value = selected.label;
    confirmation.hidden = true;
    addSibling.disabled = selected.parentId === null;
    remove.disabled = selected.parentId === null;
    populateMove();
    if (focusButton) active.focus();
  }

  function render() {
    groups = childrenOf(state.nodes);
    nodeButtons.clear();
    const fragment = document.createDocumentFragment();
    const pending = [{ node: top, into: fragment }];
    while (pending.length) {
      const { node, into } = pending.pop();
      const item = element('li', 'dm-branch');
      const leaf = button(node.label, () => {
        selectNode(node.id);
        status.textContent = '';
      }, 'dm-node');
      if (node.id === top.id) leaf.classList.add('dm-root');
      leaf.setAttribute('aria-pressed', String(selected.id === node.id));
      leaf.addEventListener('keydown', event => {
        const siblings = groups.get(node.parentId);
        const index = siblings.indexOf(node);
        const destinations = {
          ArrowLeft: node.parentId,
          ArrowRight: groups.get(node.id)?.[0]?.id,
          ArrowUp: siblings[index - 1]?.id,
          ArrowDown: siblings[index + 1]?.id,
          Home: top.id
        };
        if (event.key in destinations) {
          event.preventDefault();
          if (destinations[event.key] != null) selectNode(destinations[event.key], true);
        }
      });
      nodeButtons.set(node.id, leaf);
      item.append(leaf);
      into.append(item);
      const children = groups.get(node.id);
      if (!children?.length) continue;
      const list = element('ul', 'dm-children');
      item.append(list);
      for (let index = children.length - 1; index >= 0; index--) {
        pending.push({ node: children[index], into: list });
      }
    }
    tree.replaceChildren(fragment);
    selectNode(selected.id);
  }

  function saveName() {
    const name = input.value.trim();
    if (!name) {
      input.value = selected.label;
      status.textContent = 'Enter a name for this idea.';
      return false;
    }
    input.value = name;
    if (name === selected.label) return true;
    selected.label = name;
    nodeButtons.get(selected.id).textContent = name;
    status.textContent = 'Idea renamed.';
    changed();
    return true;
  }

  function addNode(parentId) {
    saveName();
    let id;
    do {
      id = globalThis.crypto?.randomUUID?.() || ('idea-' + Math.random().toString(36).slice(2));
    } while (nodesById.has(id));
    selected = { id, parentId, label: 'New idea' };
    state.nodes.push(selected);
    nodesById.set(id, selected);
    render();
    changed();
    status.textContent = 'Branch added. Enter a name for the new idea.';
    input.focus();
    input.select();
  }

  function confirmRemoval() {
    if (selected.parentId === null) return;
    const count = subtreeIds(selected.id, groups).size - 1;
    const children = count === 0 ? '' : ' and ' + count + (count === 1 ? ' connected idea' : ' connected ideas');
    message.textContent = 'Delete “' + selected.label + '”' + children + '?';
    confirmation.hidden = false;
    cancel.focus();
  }

  function removeBranch() {
    if (selected.parentId === null || confirmation.hidden) return;
    const removed = subtreeIds(selected.id, groups);
    selected = nodesById.get(selected.parentId);
    state.nodes = state.nodes.filter(node => !removed.has(node.id));
    for (const id of removed) nodesById.delete(id);
    render();
    changed();
    status.textContent = 'Branch deleted.';
    nodeButtons.get(selected.id).focus();
  }

  input.addEventListener('change', saveName);
  nameForm.addEventListener('submit', event => {
    event.preventDefault();
    if (saveName()) status.textContent = 'Name saved.';
  });
  target.addEventListener('change', () => { move.disabled = target.value === selected.parentId; });
  moveForm.addEventListener('submit', event => {
    event.preventDefault();
    const parent = nodesById.get(target.value);
    if (!parent || parent.id === selected.parentId || subtreeIds(selected.id, groups).has(parent.id)) return;
    selected.parentId = parent.id;
    render();
    changed();
    status.textContent = 'Branch moved under ' + parent.label + '.';
    nodeButtons.get(selected.id).focus();
  });
  render();
  return { getValue: () => copyMap(state), destroy: () => main.remove() };
}
