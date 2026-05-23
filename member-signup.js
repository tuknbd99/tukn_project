
// ========================================
// MEMBER SIGNUP SYSTEM
// ========================================

// ========================================
// SUPABASE CLIENT
// ========================================

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

// ========================================
// DISTRICT DATA
// ========================================

const divisions = {

  "ঢাকা": [
    "ঢাকা","গাজীপুর","নারায়ণগঞ্জ",
    "টাঙ্গাইল","কিশোরগঞ্জ","মানিকগঞ্জ",
    "মুন্সীগঞ্জ","নরসিংদী","ফরিদপুর",
    "গোপালগঞ্জ","মাদারীপুর",
    "রাজবাড়ী","শরীয়তপুর"
  ],

  "চট্টগ্রাম": [
    "চট্টগ্রাম","কক্সবাজার",
    "রাঙ্গামাটি","বান্দরবান",
    "খাগড়াছড়ি","কুমিল্লা",
    "ফেনী","ব্রাহ্মণবাড়িয়া",
    "নোয়াখালী","লক্ষ্মীপুর",
    "চাঁদপুর"
  ],

  "রাজশাহী": [
    "রাজশাহী","চাঁপাইনবাবগঞ্জ",
    "নাটোর","নওগাঁ","পাবনা",
    "সিরাজগঞ্জ","বগুড়া",
    "জয়পুরহাট"
  ],

  "খুলনা": [
    "খুলনা","বাগেরহাট",
    "চুয়াডাঙ্গা","যশোর",
    "ঝিনাইদহ","মাগুরা",
    "নড়াইল","সাতক্ষীরা",
    "কুষ্টিয়া","মেহেরপুর"
  ],

  "বরিশাল": [
    "বরিশাল","বরগুনা","ভোলা",
    "ঝালকাঠি","পটুয়াখালী",
    "পিরোজপুর"
  ],

  "সিলেট": [
    "সিলেট","মৌলভীবাজার",
    "হবিগঞ্জ","সুনামগঞ্জ"
  ],

  "রংপুর": [
    "রংপুর","দিনাজপুর",
    "কুড়িগ্রাম","গাইবান্ধা",
    "লালমনিরহাট","নীলফামারী",
    "পঞ্চগড়","ঠাকুরগাঁও"
  ],

  "ময়মনসিংহ": [
    "ময়মনসিংহ","জামালপুর",
    "নেত্রকোণা","শেরপুর"
  ]
};

// ========================================
// UPDATE DISTRICTS
// ========================================

function updateDistricts(
  divisionSelectId,
  districtSelectId
) {

  const divisionSelect =
    document.getElementById(
      divisionSelectId
    );

  const districtSelect =
    document.getElementById(
      districtSelectId
    );

  if (
    !divisionSelect ||
    !districtSelect
  ) return;

  const selectedDivision =
    divisionSelect.value;

  districtSelect.innerHTML =
    '<option value="">জেলা নির্বাচন করুন</option>';

  if (
    selectedDivision &&
    divisions[selectedDivision]
  ) {

    divisions[selectedDivision]
      .forEach(district => {

      const option =
        document.createElement(
          "option"
        );

      option.value = district;

      option.textContent = district;

      districtSelect.appendChild(
        option
      );
    });

  } else {

    districtSelect.disabled = true;
  }
}

// ========================================
// DYNAMIC FIELDS
// ========================================

function toggleDynamicFields() {

  const position =
    document.getElementById(
      "memberPosition"
    ).value;

  document
    .querySelectorAll(".dynamic-field")
    .forEach(el => {

      el.classList.add("hidden");
    });

  if (position === "ছাত্র") {

    document
      .getElementById(
        "studentFields"
      )
      .classList.remove("hidden");

  }

  else if (position === "ওস্তাদ") {

    document
      .getElementById(
        "teacherFields"
      )
      .classList.remove("hidden");
  }

  else if (position === "খাদেম") {

    document
      .getElementById(
        "khadimFields"
      )
      .classList.remove("hidden");
  }

  else if (position === "অন্যান্য") {

    document
      .getElementById(
        "otherFields"
      )
      .classList.remove("hidden");
  }
}

// ========================================
// GET VALUE
// ========================================

function getValue(id) {

  const el =
    document.getElementById(id);

  if (!el) return null;

  return el.value.trim();
}

// ========================================
// REFERRAL CODE
// ========================================

function generateReferralCode(
  mobile
) {

  const lastSix =
    mobile.slice(-6);

  const randomTwo =
    Math.floor(
      10 + Math.random() * 90
    );

  return lastSix + randomTwo;
}

// ========================================
// PASSWORD
// ========================================

function generatePassword() {

  const upper =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";

  const numbers =
    "0123456789";

  const upperChar =
    upper[
      Math.floor(
        Math.random() *
        upper.length
      )
    ];

  let numPart = "";

  for (let i = 0; i < 6; i++) {

    numPart += numbers[
      Math.floor(
        Math.random() *
        numbers.length
      )
    ];
  }

  return upperChar + numPart + "p";
}

// ========================================
// MEMBER ID
// ========================================

async function generateMemberId(
  memberTerm
) {

  const today =
    new Date();

  const yy =
    String(
      today.getFullYear()
    ).slice(-2);

  const mm =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  const dd =
    String(
      today.getDate()
    ).padStart(2, "0");

  const datePart =
    `${yy}${mm}${dd}`;

  let typeCode = "G";

  if (memberTerm == 3)
    typeCode = "T3";

  else if (memberTerm == 5)
    typeCode = "T5";

  else if (memberTerm == 7)
    typeCode = "T7";

  else if (memberTerm == 10)
    typeCode = "T10";

  else if (memberTerm == 12)
    typeCode = "T12";

  else if (memberTerm == 15)
    typeCode = "T15";

  const { count } =
    await supabaseClient
      .from("members")
      .select("*", {
        count: "exact",
        head: true
      });

  const serial =
    String(
      (count || 0) + 1
    ).padStart(4, "0");

  return `
TUKN ${typeCode} ${datePart}-${serial}
`.trim();
}

// ========================================
// SUCCESS NOTIFICATION
// ========================================

function showSuccess(
  member_id,
  password,
  referral_code
) {

  alert(
`নিবন্ধন সফল হয়েছে

আইডি:
${member_id}

পাসওয়ার্ড:
${password}

রেফারেল কোড:
${referral_code}`
  );
}

// ========================================
// REGISTER MEMBER
// ========================================

async function registerMember(e) {

  e.preventDefault();

  try {

    // ============================
    // CHECK AGREEMENT
    // ============================

    const agreement =
      document.getElementById(
        "agreementCheck"
      );

    if (!agreement.checked) {

      alert(
        "অনুগ্রহ করে অঙ্গীকারে টিক দিন"
      );

      return;
    }

    // ============================
    // BASIC INFO
    // ============================

    const full_name =
      getValue("fullName");

    const father_name =
      getValue("fatherName");

    const mother_name =
      getValue("motherName");

    const mobile =
      getValue("mobile");

    const telegram =
      getValue("telegram");

    const email =
      getValue("email");

    const id_number =
      getValue("idNumber");

    const id_type =
      document.querySelector(
        'input[name="idType"]:checked'
      )?.value || "জন্মনিবন্ধন";

    // ============================
    // VALIDATION
    // ============================

    if (!full_name) {

      alert("পূর্ণ নাম দিন");

      return;
    }

    if (!mobile) {

      alert("মোবাইল দিন");

      return;
    }

    if (
      !/^01[3-9]\d{8}$/.test(
        mobile
      )
    ) {

      alert(
        "সঠিক মোবাইল নাম্বার দিন"
      );

      return;
    }

    // ============================
    // DUPLICATE MOBILE
    // ============================

    const {
      data: existingMember
    } = await supabaseClient
      .from("members")
      .select("id")
      .eq("mobile", mobile)
      .maybeSingle();

    if (existingMember) {

      alert(
        "এই মোবাইল নাম্বার ইতোমধ্যে নিবন্ধিত"
      );

      return;
    }

    // ============================
    // MEMBER INFO
    // ============================

    const memberTerm =
      parseInt(
        document.getElementById(
          "memberTerm"
        ).value
      ) || 0;

    let memberType =
      "সাধারণ সদস্য";

    if (memberTerm === 3)
      memberType =
      "৩ বছর মেয়াদী";

    else if (memberTerm === 5)
      memberType =
      "৫ বছর মেয়াদী";

    else if (memberTerm === 7)
      memberType =
      "৭ বছর মেয়াদী";

    else if (memberTerm === 10)
      memberType =
      "১০ বছর মেয়াদী";

    else if (memberTerm === 12)
      memberType =
      "১২ বছর মেয়াদী";

    else if (memberTerm === 15)
      memberType =
      "১৫ বছর মেয়াদী";

    // ============================
    // GENERATE IDs
    // ============================

    const member_id =
      await generateMemberId(
        memberTerm
      );

    const password =
      generatePassword();

    let referral_code =
      generateReferralCode(
        mobile
      );

    // ============================
    // UNIQUE REFERRAL CODE
    // ============================

    let unique = false;

    while (!unique) {

      const { data } =
        await supabaseClient
          .from("members")
          .select("id")
          .eq(
            "referral_code",
            referral_code
          )
          .maybeSingle();

      if (!data) {

        unique = true;

      } else {

        referral_code =
          generateReferralCode(
            mobile
          );
      }
    }

    // ============================
    // POSITION
    // ============================

    const position =
      getValue(
        "memberPosition"
      );

    const student_class =
      getValue(
        "studentClass"
      );

    const student_madrasa =
      getValue(
        "studentMadrasa"
      );

    const student_address =
      getValue(
        "studentAddress"
      );

    const teacher_madrasa =
      getValue(
        "teacherMadrasa"
      );

    const khadim_mosque =
      getValue(
        "khadimMosque"
      );

    const other_description =
      getValue(
        "otherDescription"
      );

    // ============================
    // POSITION DETAILS
    // ============================

    const position_details = {

      student_class,

      student_madrasa,

      student_address,

      teacher_madrasa,

      khadim_mosque,

      other_description
    };

    // ============================
    // ADDRESS
    // ============================

    const present_village =
      getValue(
        "presentVillage"
      );

    const present_post_office =
      getValue(
        "presentPostOffice"
      );

    const present_thana =
      getValue(
        "presentThana"
      );

    const present_division =
      getValue(
        "presentDivision"
      );

    const present_district =
      getValue(
        "presentDistrict"
      );

    const present_details =
      getValue(
        "presentDetails"
      );

    const permanent_village =
      getValue(
        "permanentVillage"
      );

    const permanent_post_office =
      getValue(
        "permanentPostOffice"
      );

    const permanent_thana =
      getValue(
        "permanentThana"
      );

    const permanent_division =
      getValue(
        "permanentDivision"
      );

    const permanent_district =
      getValue(
        "permanentDistrict"
      );

    const permanent_details =
      getValue(
        "permanentDetails"
      );

    // ============================
    // NOMINEE
    // ============================

    const nominee_name =
      getValue(
        "nomineeName"
      );

    const nominee_relation =
      getValue(
        "nomineeRelation"
      );

    const nominee_nid =
      getValue(
        "nomineeNid"
      );

    // ============================
    // OTHER INFO
    // ============================

    const monthly_savings =
      parseInt(
        getValue(
          "monthlySavings"
        )
      ) || 0;

    const profession =
      getValue(
        "profession"
      );

    const education =
      getValue(
        "education"
      );

    const referred_by =
      getValue(
        "referCode"
      );

    // ============================
    // MEMBER DATA
    // ============================

    const memberData = {

      member_id,

      full_name,

      father_name,

      mother_name,

      mobile,

      telegram,

      email,

      id_type,

      id_number,

      password,

      member_type:
        memberType,

      member_term:
        memberTerm,

      monthly_savings,

      profession,

      education,

      present_village,

      present_post_office,

      present_thana,

      present_division,

      present_district,

      present_details,

      permanent_village,

      permanent_post_office,

      permanent_thana,

      permanent_division,

      permanent_district,

      permanent_details,

      nominee_name,

      nominee_relation,

      nominee_nid,

      referral_code,

      status: "pending",

      join_date:
        new Date()
        .toISOString(),

      approved_at: null,

      approved_by: null,

      position,

      position_details,

      student_class,

      student_madrasa,

      student_address,

      teacher_madrasa,

      khadim_mosque,

      other_description,

      profile_image: null,

      total_savings: 0,

      total_commission: 0,

      withdrawal_balance: 0,

      referred_by,

      referral_bonus: 0,

      referral_level: 0,

      referral_count: 0,

      per_referral_bonus: 0,

      profit_bonus: 0,

      capital_balance:
        monthly_savings
    };

    // ============================
    // INSERT MEMBER
    // ============================

    const {
      data,
      error
    } = await supabaseClient
      .from("members")
      .insert([memberData])
      .select();

    if (error) {

      console.error(error);

      alert(error.message);

      return;
    }

    // ============================
    // REFERRAL BONUS
    // ============================

    if (referred_by) {

      const {
        data: refUser
      } = await supabaseClient
        .from("members")
        .select("*")
        .eq(
          "referral_code",
          referred_by
        )
        .maybeSingle();

      if (refUser) {

        const bonus = 10;

        await supabaseClient
          .from("members")
          .update({

            referral_bonus:
              (
                refUser
                .referral_bonus || 0
              ) + bonus,

            referral_count:
              (
                refUser
                .referral_count || 0
              ) + 1,

            total_commission:
              (
                refUser
                .total_commission || 0
              ) + bonus,

            withdrawal_balance:
              (
                refUser
                .withdrawal_balance || 0
              ) + bonus
          })
          .eq(
            "id",
            refUser.id
          );
      }
    }

    // ============================
    // SUCCESS
    // ============================

    showSuccess(
      member_id,
      password,
      referral_code
    );

    document
      .getElementById(
        "signupForm"
      )
      .reset();

    location.reload();

  } catch (err) {

    console.error(err);

    alert(
      "সার্ভার সমস্যা হয়েছে"
    );
  }
}

// ========================================
// EVENT LISTENERS
// ========================================

document
  .getElementById(
    "presentDivision"
  )
  ?.addEventListener(
    "change",
    () => updateDistricts(
      "presentDivision",
      "presentDistrict"
    )
  );

document
  .getElementById(
    "permanentDivision"
  )
  ?.addEventListener(
    "change",
    () => updateDistricts(
      "permanentDivision",
      "permanentDistrict"
    )
  );

document
  .getElementById(
    "memberPosition"
  )
  ?.addEventListener(
    "change",
    toggleDynamicFields
  );

document
  .getElementById(
    "signupForm"
  )
  ?.addEventListener(
    "submit",
    registerMember
  );
