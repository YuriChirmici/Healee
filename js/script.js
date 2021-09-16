let viewModel = kendo.observable({
	baseURL: 'https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies',
	currencies: ['usd', 'eur', 'aud', 'cad', 'chf', 'nzd', 'bgn'],
	currency: 'usd',
	currencyData: {},

	isLoading: true,

	longestChain() {
		let currencyData = this.get('currencyData')[this.get('currency')];
		if (!currencyData) return "loading...";

		return getLongestChain(currencyData.exchangeRate);
	},

	currencyChange(e) {
		let a = this.get('currency');

		if (e) {
			this.set('currency', e.sender.value());
		}

		let currencyData = this.get('currencyData')[this.get('currency')];
		if (!currencyData) return null;

		for (let i = 0; i < 3; i++) {
			this.set(`groupList${i}`, currencyGroup(currencyData, i))
		}
	},

	valueIncrement() {
		let exchangeRate = this.get('currencyData')[this.get('currency')].exchangeRate;

		exchangeRate.forEach(el => {
			el.value = +((el.value + 1).toFixed(6));
		})

		this.get('currencyChange').call(this);
	},
});

kendo.bind($('.container'), viewModel);

let currencyDropDownList = $("#currency").kendoDropDownList({
	optionLabel: "Select currency...",
	dataTextField: "CurrencyName",
	height: 300,
	template: '<span class=\"k-state-default\"><h3>#: data #</h3></span>',
	valueTemplate: '<span style="text-transform: uppercase; font-weight: 700;">#:data.CurrencyName#</span>',
	dataSource: viewModel.get('currencies'),
	change: viewModel.get('currencyChange').bind(viewModel),
	value: viewModel.get('currency'),
}).data("kendoDropDownList");


window.onload = function() {
	
	let currencies = viewModel.get('currencies');
	let baseURL = viewModel.get('baseURL');
	let currencySelected = viewModel.get('currency');

	let promises = [];

	//if the data is in local storage, we take it from there, 
	//otherwise we send a request to the server
	currencyData = getFromLocalStorage();
	if (currencyData) {
		viewModel.set('currencyData', currencyData);
		viewModel.set('isLoading', false);
		viewModel.get('currencyChange').call(viewModel);
	}
	else {
		for (let i = 0; i < currencies.length; i++) {
			for (let j = 0; j < currencies.length; j++) {
				if (i === j) continue;
				promises.push(axios.get(`${baseURL}/${currencies[i]}/${currencies[j]}.json`));				
			}
		}

		axios.all(promises)
			.then( (responses) => {
				currencyData = {};
				viewModel.set('isLoading', false);

				responses.forEach(response => {
					let currencyURL = response.config.url.split('/');
					let currentCurrency = currencyURL[currencyURL.length - 2];
					let currencyTo = currencyURL[currencyURL.length - 1].split('.')[0];

					let exchangeRateData = {
						currency: currentCurrency,
						currencyTo: currencyTo,
						value: response.data[currencyTo],
						date: response.data.date
					}

					if (currentCurrency in currencyData) {
						currencyData[currentCurrency].exchangeRate.push(exchangeRateData)
					}
					else {
						currencyData[currentCurrency] = {
							currency: currentCurrency,
							exchangeRate: [exchangeRateData]
						}
					}

					if (currencyTo in currencyData) {
						currencyData[currencyTo].exchangeRate.push(exchangeRateData)
					}
					else {
						currencyData[currencyTo] = {
							currency: currencyTo,
							exchangeRate: [exchangeRateData]
						}
					}

				})

				localStorage.setItem('currency', JSON.stringify({
					data: currencyData,
					date: getDate()
				}));

				viewModel.set('currencyData', currencyData);
				viewModel.get('currencyChange').call(viewModel);
			});
	}
}

function currencyGroup(data, index) {
	let groups = [[], [], []];
	
	data.exchangeRate.forEach( el => {
		el.currency = el.currency.toUpperCase();
		el.currencyTo = el.currencyTo.toUpperCase();

		if (el.value < 1) {
			groups[0].push(el);
		}
		else if (el.value < 1.5) {
			groups[1].push(el);
		}
		else {
			groups[2].push(el);
		}
	})

	groups.forEach((group) => {		
		group.sort((a, b) => a.value - b.value);
	});
	return groups[index];
}

function getFromLocalStorage() {
	//returns false or data from localStorage
	let currency = JSON.parse(localStorage.getItem('currency'));
	if (currency) {
		if(currency.date === getDate()) {
			return currency.data;
		}
	}
	return false;
}

function getDate() {
	//today in yyyy-mm-dd
	let today = new Date();
	let dd = today.getDate();
	let mm = today.getMonth() + 1; 
	let yyyy = today.getFullYear();

	dd = (dd < 10) ? "0" + dd : dd;
	mm = (mm < 10) ? "0" + mm : mm;
	return `${yyyy}-${mm}-${dd}`;
}

function getLongestChain(data) {
	//the absolute difference between any two elements of the array is <= 0.5
	let chains = [];
	let difference = 0.5;

	for (let i = 0; i < data.length; i++) {
		let num = data[i].value;
		let chain = [data[i]];
		let min = num;
		let max = num;
		for (let j = 0; j < data.length; j++) {
			let currentNum = data[j].value;
			if (i === j || currentNum < max - difference || 
				currentNum > min + difference) continue;

			if (currentNum < min) {
				min = currentNum;
			}

			if (currentNum > max) {
				max = currentNum;
			}

			chain.push(data[j]);
		}
		chains.push(chain);
	}
	let maxLength = chains.reduce((prev, chain) => {
		return (prev > chain.length) ? prev : chain.length;
	}, 0);

	return maxLength;
}