import api from './authApi';

export async function getCompanies(params = {}) {
  const { data } = await api.get('/companies', { params });
  return data;
}

export async function getCompany(id) {
  const { data } = await api.get(`/companies/${id}`);
  return data;
}

export async function createCompany(companyData) {
  const { data } = await api.post('/companies', companyData);
  return data;
}

export async function updateCompany(id, companyData) {
  const { data } = await api.put(`/companies/${id}`, companyData);
  return data;
}

export async function getCompanyStatement(id, params) {
  const { data } = await api.get(`/companies/${id}/statement`, { params });
  if (data) {
    if (data.summary) {
      data.summary.totalShipments = Number(data.summary.totalShipments || 0);
      data.summary.totalWeightSent = parseFloat(data.summary.totalWeightSent) || 0;
      data.summary.totalWeightReceived = parseFloat(data.summary.totalWeightReceived) || 0;
      data.summary.totalCredit = parseFloat(data.summary.totalCredit) || 0;
      data.summary.totalDebit = parseFloat(data.summary.totalDebit) || 0;
      data.summary.openingBalance = parseFloat(data.summary.openingBalance) || 0;
      data.summary.closingBalance = parseFloat(data.summary.closingBalance) || 0;
      data.summary.netBalance = parseFloat(data.summary.netBalance) || 0;
    }
    if (data.rows) {
      data.rows = data.rows.map(row => ({
        ...row,
        weight: parseFloat(row.weight) || 0,
        debit: parseFloat(row.debit) || 0,
        credit: parseFloat(row.credit) || 0,
        runningBalance: parseFloat(row.runningBalance) || 0,
      }));
    }
  }
  return data;
}
