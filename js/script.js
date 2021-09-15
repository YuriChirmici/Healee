let currencies = ['usd', 'eur', 'aud', 'cad', 'chf', 'nzd', 'bgn'];

let currencyData = {};

let selectData = {
	getData() {
		renderHTML(currencyData);
	}
}

let viewModel = kendo.observable(selectData);
kendo.bind($('select[name=currency]'), viewModel);

window.onload = function() {
	let currencySelect = $('select[name=currency]');
	let baseURL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies';
	localStorage.clear();
	createOptions(currencySelect, currencies);
	setLoading(true);
	let promises = [];
	
	//if the data is in local storage, we take it from there, 
	//otherwise we send a request to the server
	currencyData = getFromLocalStorage();
	if (currencyData) {
		renderHTML(currencyData);
		setLoading(false);
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
				setLoading(false);

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
				currencyInfo = currencyData;
				renderHTML(currencyData)
			});
	}
}

function renderHTML(data) {
	let currencySelect = $('select[name=currency]')[0];
	let currencySelected = currencySelect.value;
	let exchangeRateDiv = $('.exchangeRate')[0];
	let longestArrayDiv = $('.longestArray')[0];``

	exchangeRateDiv.innerHTML = '';
	longestArrayDiv.innerHTML = '';
	let groups = [[], [], []];

	//divides into 3 groups depending on the value
	data[currencySelected].exchangeRate.forEach( el => {
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

	//creates a div and adds sorted values
	groups.forEach((group) => {
		let div = document.createElement('div');
		div.classList.add('currencyGroup');
		
		group.sort((a, b) => a.value - b.value);

		group.forEach(el => {
			let p = `<p> ${el.currency.toUpperCase()}-${el.currencyTo.toUpperCase()}: ${el.value} </p>`;
			div.insertAdjacentHTML('beforeend', p);
		});
		let p = `<p class="red"> Count: ${group.length}`;
		div.insertAdjacentHTML('beforeend', p);
		exchangeRateDiv.append(div);
	});	

	let maxLength = getLongestChain(data[currencySelected].exchangeRate);
	let p = `<p class="red"> The length of the longest array: ${maxLength}`;
	longestArrayDiv.insertAdjacentHTML('beforeend', p);
}

function toggleOptions(element, disabled) {
	//disables the ability to select an option so that multiple requests 
	//cannot be sent to the server until a response is received
	let op = element.children("option");
	for (let i = 0; i < op.length; i++) {
		op[i].disabled = disabled;
	}
}

function createOptions(element, labels) {
	labels.forEach( (label, i) => {
		let isSelected = i === 0 ? true : false;
		let selectedOption = $('<option>', {
				value: label,
				text: label.toUpperCase()
		});

		selectedOption.attr('selected', isSelected);

		element.append(selectedOption);
	})
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

function setLoading(isLoading) {
	let currencySelect = $('#currency');
	let loading = $('.loading');

	toggleOptions(currencySelect, isLoading);

	if(isLoading) {
		loading.addClass("hide");
	}
	else {
		loading.removeClass("hide");
	}
}