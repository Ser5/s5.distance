let expect = chai.expect;
let assert = chai.assert;

let boxSizingsList = [
	{name: 'border-box', postfix: 'bb', directionsList: [
		{name: 'Горизонтально', testsList: [
			{name: 'От дальних краёв', params: ['marginLeft', 'marginRight'], expected: 670},
			{name: 'От ближних краёв', params: ['marginRight','marginLeft'],  expected: 350},
			{name: 'От левого края до левой границы',            params: ['marginLeft', 'borderLeft'],   expected: 500},
			{name: 'От левого края до левого паддинга',          params: ['marginLeft', 'paddingLeft'],  expected: 503},
			{name: 'От левого края до левой части содержимого',  params: ['marginLeft', 'contentLeft'],  expected: 518},
			{name: 'От левого края до правой части содержимого', params: ['marginLeft', 'contentRight'], expected: 632},
			{name: 'От левого края до правого паддинга',         params: ['marginLeft', 'paddingRight'], expected: 647},
			{name: 'От левого края до правой границы',           params: ['marginLeft', 'borderRight'],  expected: 650},
		]},
		{name: 'Вертикально', postfix: 'bb', testsList: [
			{name: 'Между наружними частями',   params: ['marginTop',    'marginBottom'], expected: 380},
			{name: 'Между внутренними частями', params: ['marginBottom', 'marginTop'],    expected: 60},
			{name: 'От верха до верха',         params: ['marginTop',    'marginTop'],    expected: 190},
			{name: 'От низа до низа',           params: ['marginBottom', 'marginBottom'], expected: 250},
		]},
	]},
	{name: 'content-box', postfix: 'cb', directionsList: [
		{name: 'Горизонтально', testsList: [
			{name: 'От дальних краёв', params: ['marginLeft', 'marginRight'], expected: 406},
			{name: 'От ближних краёв', params: ['marginRight','marginLeft'],  expected: 28},
		]},
	]},
];

for (let bs of boxSizingsList) {
	describe(bs.name, function() {
		for (let d of bs.directionsList) {
			describe(d.name, function() {
				for (let t of d.testsList) {
					let got = S5.Distance.get.call(
						S5.Distance,
						`.block_from-${bs.postfix}`, t.params[0],
						`.block_to-${bs.postfix}`,   t.params[1]
					);
					it(`${t.name} даёт ${t.expected}`, function () {
						assert.equal(got, t.expected);
					});
				}
			});
		}
	});
}

describe('Ошибки', function() {
	it(`"paddingLeftLeft" - правильное окончание, но нет такой части`, function () {
		expect(
			() => S5.Distance.get(`.block_from-bb`, 'paddingLeftLeft', `.block_to-bb`, 'paddingLeft')
		).to.throw();
	});
	it(`Первой частью указываем непонятное "paddingLeht"`, function () {
		expect(
			() => S5.Distance.get(`.block_from-bb`, 'paddingLeht', `.block_to-bb`, 'paddingLeft')
		).to.throw();
	});
	it(`Второй частью указываем непонятное "paddingTottom"`, function () {
		expect(
			() => S5.Distance.get(`.block_from-bb`, 'paddingTop', `.block_to-bb`, 'paddingTottom')
		).to.throw();
	});
	it(`Первой части указываем горизонтальную сторону, второй - вертикальную`, function () {
		expect(
			() => S5.Distance.get(`.block_from-bb`, 'paddingLeft', `.block_to-bb`, 'paddingTop')
		).to.throw();
	});
});
