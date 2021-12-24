window.S5 = window.S5 || {};

S5.Distance = {
	//h - для горизонтальных расстояний
	//v - для вертикальных
	//params - что передаётся в параметрах метода
	//style  - свойства, используемые из стилей
	partsData: {
		h: {
			params: {
				marginLeft:   0,
				borderLeft:   1,
				paddingLeft:  2,
				contentLeft:  3,
				contentRight: 4,
				paddingRight: 5,
				borderRight:  6,
				marginRight:  7,
			},
			style: ['marginLeft', 'borderLeftWidth', 'paddingLeft', '_zero', '_contentWidth', 'paddingRight',  'borderRightWidth',  'marginRight'],
			startSideName: 'left',
			sizeStyleName: 'width',
		},
		v: {
			params: {
				marginTop:     0,
				borderTop:     1,
				paddingTop:    2,
				contentTop:    3,
				contentBottom: 4,
				paddingBottom: 5,
				borderBottom:  6,
				marginBottom:  7,
			},
			style: ['marginTop', 'borderTopWidth', 'paddingTop', '_zero', '_contentHeight', 'paddingBottom',  'borderBottomWidth',  'marginBottom'],
			startSideName: 'top',
			sizeStyleName: 'height',
		},
	},

	startIndexesMap: {
		'content-box': 1,
		'padding-box': 2,
		'border-box':  1,
	},

	get (from, fromPart, to, toPart) {
		'use strict';

		//На какое измерение указывает каждая часть - горизонтальное или вертикальное?
		let partSidesMap = {[fromPart]:false, [toPart]:false};
		for (let part in partSidesMap) {
			//Такая часть вообще существует?
			if (this.partsData.h.params[part] === undefined && this.partsData.v.params[part] === undefined) {
				throw new Error(`Unknown part name: [${part}].`);
			}
			//h или v?
			if (part.indexOf('Left') != -1 || part.indexOf('Right') != -1) {
				partSidesMap[part] = 'h';
			} else {
				partSidesMap[part] = 'v';
			}
		}

		//Какое расстояние измеряем - горизонтальное или вертикальное?
		let dimension;
		if (partSidesMap[fromPart] == 'h' && partSidesMap[toPart] == 'h') {
			dimension = 'h';
		}
		else if (partSidesMap[fromPart] == 'v' && partSidesMap[toPart] == 'v') {
			dimension = 'v';
		}
		else {
			throw new Error(`Both fromPart and toPart should belong to the same dimension - horizontal or vertical. Got [${fromPart}] and [${toPart}].`);
		}

		//Составим единообразный список данных для начального и конечного элементов
		let nodesDataList = [
			{node: from, part: fromPart, pos: null, style: null, distance: 0},
			{node: to,   part: toPart,   pos: null, style: null, distance: 0},
		];
		for (let nodeData of Object.values(nodesDataList)) {
			if (!(nodeData.node instanceof Node)) {
				if (typeof nodeData.node == 'string') {
					let node = document.querySelector(nodeData.node);
					if (node) {
						nodeData.node = node;
					} else {
						throw new Error(`Element not found: [${nodeData.node}]`);
					}
				} else {
					throw new Error(`Unknown node type: [${nodeData.node.constructor.name}]`);
				}
			}
			nodeData.style = getComputedStyle(nodeData.node);
			let rect       = nodeData.node.getBoundingClientRect();
			nodeData.pos   = {
				left: window.scrollX + rect.left,
				top:  window.scrollY + rect.top,
			};
			//console.log(`pos: [${rect.left}; ${rect.top}]`);
		}

		//В зависимости от того, считаем ли мы расстояние по горизонтали или вертикали,
		//будем использовать разные наборы данных по названиям полей:
		//- для горизонтали это paddingRight,  marginRight  итд
		//- для вертикали   это paddingBottom, marginBottom итд
		let {params: paramPartsData, style: styleNamesList, startSideName, sizeStyleName} = this.partsData[dimension];

		//Сначала получим расстояние между левыми верхними углами элементов
		let totalDistance = nodesDataList[1].pos[startSideName] - nodesDataList[0].pos[startSideName];
		//console.log(`initital distance: ${totalDistance}`);

		//Далее, надо скорректировать расстояние, приняв во внимание требуемые части.
		//Обычно, при box-sizing:border-box, блок вмещает в себя границы, паддинги и содержимое.
		//Соответственно, изначально расстояние между блоками считается между левыми верхними углами границ.
		//Но, например, если нам надо посчитать расстояние от левого margin, то к изначальному расстоянию
		//надо прибавить размер левого margin.
		//И наоборот, если расстояние мы считаем от правого margin, то от изначального расстояния
		//мы отнимаем размеры borderLeft, paddingLeft, ширину содержимого, paddingRight, borderRight и marginRight.
		for (let [nodeIndex, nodeData] of Object.entries(nodesDataList)) {
			let boxStartIndex = this.startIndexesMap[nodeData.style.boxSizing];
			//console.log(`node ${nodeIndex}, box-sizing: ${nodeData.style.boxSizing}, start index: ${boxStartIndex}`);

			let partIndex = paramPartsData[nodeData.part];

			let fromIndex;
			let toIndex;
			let op;
			if (partIndex < boxStartIndex) {
				//Если части находятся левее начала бокса, то:
				//Блок 1: размеры частей прибавляем к расстоянию
				//Блок 2: размеры частей вычитаем из расстояния
				fromIndex = 0;
				toIndex   = boxStartIndex - 1;
				op        = 1;
			} else if (partIndex > boxStartIndex) {
				//Если части находятся правее начала бокса, то:
				//Блок 1: размеры частей вычитаем из расстояния
				//Блок 2: размеры частей прибавляем к расстоянию
				fromIndex = boxStartIndex;
				toIndex   = partIndex - 1;
				op        = -1;
			} else {
				fromIndex = -1;
			}

			//Корректируем расстояние только если часть не является началом бокса
			if (fromIndex > -1) {
				let p = function (styleName) {
					return parseInt(nodeData.style[styleName]);
				};
				//Когда мы говорим "левый margin", это значит, мы имеем в виду ЛЕВУЮ часть левого маргина.
				//Но если это "правый margin" - это уже ПРАВАЯ часть правого маргина.
				//Соответственно, в первом случае размер маргина в расчёты включать не надо.
				//А во втором случае - надо.
				//Смотрим: если требуемая часть находится правее середины бокса, то включаем её в расчёты.
				if (partIndex > 3) {
					toIndex++;
				}
				//Для первого блока всё, что находится левее начала бокса, к расстоянию прибавляется.
				//Для правого, соответственно, - вычитается.
				//Для частей, находящихся правее начала бокса, всё наоборот.
				if (nodeIndex == 1) {
					op *= -1;
				}
				//console.log(`from ${fromIndex} to ${toIndex}`);
				for (let index = fromIndex; index <= toIndex; index++) {
					let styleName = styleNamesList[index];
					let partSize;
					if (styleName == '_zero') {
						partSize = 0;
					} else if (styleName == styleNamesList[4]) {
						//_contentWidth или _contentHeight.
						//
						//Content в нашем случае это то, что лежит в самой глубине бокса - исключая
						//маргины, бордеры и паддинги. В разных моделях box-sizing размер контента
						//рассчитывается относительно размера бокса по-разному.
						//
						//Посчитаем размер контента из размера бокса, учитывая box-sizing.
						//
						//Для content-box размеры контента и бокса совпадают, ничего корректировать не надо.
						partSize = p(sizeStyleName);
						if (nodeData.style.boxSizing == 'border-box') {
							//Минус бордеры и паддинги
							partSize -= (p(styleNamesList[1]) + p(styleNamesList[2]) + p(styleNamesList[5]) + p(styleNamesList[6]));
						} else if (nodeData.style.boxSizing == 'padding-box') {
							//Минус паддинги
							partSize -= (p(styleNamesList[2]) + p(styleNamesList[5]));
						}
					} else {
						partSize = p(styleName);
					}
					totalDistance += (partSize * op);
					//console.log(`${styleName} size is ${partSize * op} -> ${totalDistance}`);
				}
			}
		}

		return totalDistance;
	}
};
