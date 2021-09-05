window.onload = function() {
	let currencies = ['usd', 'eur', 'aud', 'cad', 'chf', 'nzd', 'bgn'];
	let baseURL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies';
	disableOptions(currencySelect, true);
	let promises = [];
	let currencyData = getFromLocalStorage();

	if (currencyData) {
		currencyInfo = currencyData;
		renderHTML(currencyData);
		disableOptions(currencySelect, false);
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
				let currencyData = {};
				disableOptions(currencySelect, false);

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
	//
	let currencySelect = document.querySelector('#currency');
	let currencySelected = document.querySelector('#currency').value;
	let exchangeRateDiv = document.querySelector('.exchangeRate');
	exchangeRateDiv.innerHTML = "";
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
		let p = `<p> Count: ${group.length}`;
		div.insertAdjacentHTML('beforeend', p);
		exchangeRateDiv.append(div);
	});	
}

function disableOptions(element, disabled) {
	//disables the ability to select an option so that multiple requests 
	//cannot be sent to the server until a response is received
	let op = element.getElementsByTagName("option")
	for (let i = 0; i < op.length; i++) {
		op[i].disabled = disabled;
	}
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

let currencySelect = document.querySelector('#currency');
let currencyInfo;

currencySelect.addEventListener('change', () => renderHTML(currencyInfo));