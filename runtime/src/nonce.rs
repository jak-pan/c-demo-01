// This file is part of Substrate.

// Copyright (C) 2017-2021 Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: Apache-2.0

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// 	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

use codec::{Encode, Decode};
use frame_system::Config;
pub use frame_system::CheckNonce;
use frame_support::dispatch::DispatchInfo;
use alloc::vec::Vec;
use alloc::vec;
use sp_runtime::{
	traits::{SignedExtension, DispatchInfoOf, Dispatchable, One},
	transaction_validity::{
		ValidTransaction, TransactionValidityError, InvalidTransaction, TransactionValidity,
		TransactionLongevity,
	},
};

impl<T: Config> SignedExtension for CheckNonce<T> where
	frame_system::Call: Dispatchable<Info=DispatchInfo>
{
	type AccountId = frame_system::AccountId;
	type Call = T::Call;
	type AdditionalSigned = ();
	type Pre = ();
	const IDENTIFIER: &'static str = "CheckNonce";

	fn additional_signed(&self) -> Result<(), TransactionValidityError> { Ok(()) }

	fn pre_dispatch(
		self,
		who: &Self::AccountId,
		_call: &Self::Call,
		_info: &DispatchInfoOf<Self::Call>,
		_len: usize,
	) -> Result<(), TransactionValidityError> {
		Ok(())
	}

	fn validate(
		&self,
		who: &Self::AccountId,
		_call: &Self::Call,
		_info: &DispatchInfoOf<Self::Call>,
		_len: usize,
	) -> TransactionValidity {
		// check index
		let provides = vec![Encode::encode(&(who, self.0))];
		let requires = vec![];

		Ok(ValidTransaction {
			priority: 0,
			requires,
			provides,
			longevity: TransactionLongevity::max_value(),
			propagate: true,
		})
	}
}